"""Inspect task for scoring the final visible turn of a conversation prefix."""

import asyncio
from collections import Counter
import json
from pathlib import Path
from urllib.parse import quote

from inspect_ai import Task, task
from inspect_ai.dataset import MemoryDataset, Sample
from inspect_ai.model import ModelOutput
from inspect_ai.scorer import Metric, SampleScore, Score, Scorer, Target, metric, scorer
from inspect_ai.solver import Generate, Solver, TaskState, solver

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
CODES = {"assistant": ("A5", "A1", "A2"), "user": ("H1", "H2")}
FULL_CODES = {**CODES, "assistant": (*CODES["assistant"], "A7")}
DECISIONS = ("present", "absent", "uncertain")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def review_targets(path: Path, packet_path: Path, packet: dict, turns: dict) -> dict:
    review = read_json(path)
    if (review["traceFile"], review["version"]) != (packet_path.name, packet["version"]):
        raise ValueError("Review trace file or version differs from the packet.")
    rows = {}
    for row in review["targets"]:
        key = (row["conversationId"], row["assessedThroughTurn"])
        if key in rows or key not in turns or row["role"] != turns[key]:
            raise ValueError(f"Unknown, duplicate, or incorrectly attributed review target {key}.")
        rows[key] = row
    return rows


def normalize_reference(prefix: list[dict], decisions: dict, evidence: list[dict], codes=CODES) -> dict:
    applicable = codes[prefix[-1]["role"]]
    if any(code not in applicable or status not in (*DECISIONS, None, "not_assessed")
           for code, status in decisions.items()):
        raise ValueError("Invalid reference code or decision.")
    assessed = {code: status for code, status in decisions.items() if status in DECISIONS}
    by_code = {}
    for item in evidence:
        code, text = item["code"], item.get("quote", "")
        if code in by_code or assessed.get(code) not in ("present", "uncertain"):
            raise ValueError(f"Duplicate or unassessed evidence for {code}.")
        if not isinstance(text, str) or text not in prefix[-1]["text"]:
            raise ValueError(f"Reference quote for {code} does not match the target.")
        context = item.get("context", [])
        for span in context:
            prior = span["turn"]
            if (type(prior) is not int or not 1 <= prior < len(prefix)
                    or not span["quote"] or span["quote"] not in prefix[prior - 1]["text"]):
                raise ValueError(f"Reference context for {code} must match an earlier visible turn.")
        by_code[code] = {"quote": text, "context": context}
        if code == "A7" and assessed[code] == "present":
            if item.get("retentionKind") not in ("invitation", "pressure"):
                raise ValueError("Present A7 reference requires invitation or pressure.")
            by_code[code]["retentionKind"] = item["retentionKind"]
    for code, status in assessed.items():
        if status == "present" and not by_code.get(code, {}).get("quote"):
            raise ValueError(f"Present reference for {code} requires a target quote.")
    return {"decisions": assessed, "evidence": by_code}


def focused_dataset(
    packet: str, review: str = "", split_file: str = "", split: str = "",
) -> MemoryDataset:
    packet_path = REPO / packet
    data = read_json(packet_path)
    packet_codes = {role: tuple(codes) for role, codes in data["codesBySpeaker"].items()}
    full_scope = "A7" in packet_codes.get("assistant", ())
    supported = FULL_CODES if full_scope else CODES
    if {role: sorted(codes) for role, codes in packet_codes.items()} != {
        role: sorted(codes) for role, codes in supported.items()
    }:
        raise ValueError("Packet codes do not match the focused codebook.")
    conversations = data["conversations"]
    families = {conversation["family"] for conversation in conversations}
    if bool(split_file) != bool(split):
        raise ValueError("Supply split_file and split together.")
    partitions = read_json(REPO / split_file) if split_file else {}
    if split_file and any(not isinstance(partitions.get(family), str) or not partitions[family]
                          for family in families):
        raise ValueError("The split manifest must assign every packet family to a named split.")

    turns = {}
    for conversation in conversations:
        for number, turn in enumerate(conversation["turns"], start=1):
            key = (conversation["id"], turn["turn"])
            if (key in turns or turn["turn"] != number or turn["role"] not in CODES
                    or not isinstance(turn["text"], str)):
                raise ValueError(f"Invalid or duplicate packet turn {key}.")
            turns[key] = turn["role"]

    imported = review_targets(REPO / review, packet_path, data, turns) if review else {}
    reference = "imported_review" if review else "authored_development"
    family_sizes = Counter()
    for conversation in conversations:
        family_sizes[conversation["family"]] += len(conversation.get("targets") or conversation["turns"])
    samples = []
    for conversation in conversations:
        family = conversation["family"]
        if split and partitions[family] != split:
            continue
        conversation_id = conversation["id"]
        authored_rows = conversation.get("targets", [])
        authored = {row["turn"]: row for row in authored_rows}
        if (len(authored) != len(authored_rows) or any((conversation_id, number) not in turns for number in authored)
                or (not review and not authored)):
            raise ValueError(f"Missing, duplicate, or invalid authored targets for {conversation_id}.")
        prefix = []
        for turn in conversation["turns"]:
            number, role = turn["turn"], turn["role"]
            prefix.append({"turn": number, "role": role, "text": turn["text"]})
            if authored and number not in authored:
                continue
            if review:
                row = imported.get((conversation_id, number), {"decisions": {}})
                decisions, evidence = row["decisions"], row.get("evidence", [])
            else:
                if number not in authored:
                    continue
                row = authored[number]
                evidence = row["findings"]
                assessed_codes = row.get("assess", supported[role])
                if not assessed_codes or set(assessed_codes) - set(supported[role]):
                    raise ValueError(f"Invalid assessed code list for {conversation_id}/{number}.")
                decisions = dict.fromkeys(assessed_codes, "absent")
                for item in evidence:
                    if item["code"] not in decisions:
                        raise ValueError(f"Finding outside the assessed codes for {conversation_id}/{number}.")
                    decisions[item["code"]] = item["status"]
            target = normalize_reference(prefix, decisions, evidence, supported)
            samples.append(Sample(
                id=f"{quote(packet_path.stem, safe='')}/{quote(conversation_id, safe='')}/{number}",
                input=json.dumps({"turns": prefix}, ensure_ascii=False),
                target=json.dumps(target, ensure_ascii=False),
                metadata={
                    "packet": packet_path.name, "packet_version": data["version"],
                    "conversation_id": conversation_id, "family": family,
                    "target_turn": number, "role": role, "split": split or "all",
                    "reference": reference,
                    "include_retention": full_scope,
                    "family_target_count": family_sizes[family],
                },
            ))
    if not samples:
        raise ValueError("No samples in the selected packet and split.")
    return MemoryDataset(samples, name=f"{packet_path.stem}-{reference}-{split or 'all'}")


@solver
def focused_detector(detector: str = "rules", target_evidence: bool = False) -> Solver:
    scripts = {"rules": "inspect_baseline.mjs", "openai": "inspect_online.mjs"}
    script = scripts[detector]
    flags = ["--target-evidence"] if target_evidence else []

    async def solve(state: TaskState, generate: Generate) -> TaskState:
        retention_flags = ["--retention"] if state.metadata.get("include_retention") else []
        process = await asyncio.create_subprocess_exec(
            "node", str(HERE / script), *flags, *retention_flags,
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            output, error = await process.communicate(state.input_text.encode("utf-8"))
        finally:
            if process.returncode is None:
                process.kill()
                await process.wait()
        if process.returncode:
            raise RuntimeError(f"Focused detector failed: {error.decode('utf-8', errors='replace')}")
        completion = output.decode("utf-8")
        state.output = ModelOutput.from_content(json.loads(completion)["detector"], completion)
        return state
    return solve


def utf16(text: str) -> bytes:
    return text.encode("utf-16-le", errors="surrogatepass")


def validated_span(span: dict, text: str, counts: Counter) -> list[dict]:
    # JavaScript offsets count UTF-16 code units, even across astral characters.
    source = utf16(text)
    start, end = span.get("start"), span.get("end")
    exact_quote = span.get("quote")
    valid = (
        type(start) is int and type(end) is int and 0 <= start < end <= len(source) // 2
        and isinstance(exact_quote, str) and utf16(exact_quote) == source[2 * start:2 * end]
    )
    counts["valid_spans" if valid else "invalid_spans"] += 1
    return [span] if valid else []


def compare_quote(counts: Counter, bucket: str, text: str, expected: str, spans: list[dict]) -> bool:
    counts[f"{bucket}_references"] += 1
    exact = overlap = anchored = False
    start = text.find(expected)
    while start != -1:
        left = len(utf16(text[:start])) // 2
        right = left + len(utf16(expected)) // 2
        for span in spans:
            exact |= span["start"] == left and span["end"] == right
            shared = min(span["end"], right) - max(span["start"], left)
            overlap |= shared > 0
            anchored |= 2 * shared >= max(right - left, span["end"] - span["start"])
        start = text.find(expected, start + 1)
    counts[f"{bucket}_exact"] += exact
    counts[f"{bucket}_overlap"] += overlap
    counts[f"{bucket}_anchored"] += anchored
    return anchored


def score_prefix(turns: list[dict], expected: dict, output: dict, include_retention: bool = False) -> tuple[dict, dict]:
    target = turns[-1]
    codes = (FULL_CODES if include_retention else CODES)[target["role"]]
    if (output["turn"], output["role"]) != (target["turn"], target["role"]):
        raise ValueError("Prediction refers to a different target.")
    counts = Counter(targets=1)
    counts["rejected_findings"] = output.get("rejectedFindings", 0)
    grounded_predictions, target_spans, context_spans = {}, {}, {}
    for item in output["findings"]:
        code, status = item["code"], item["status"]
        if code in grounded_predictions or code not in codes or status not in ("present", "uncertain"):
            raise ValueError(f"Duplicate or inapplicable finding or invalid status for {code}.")
        grounded_predictions[code] = status
        target_spans[code] = validated_span(item, target["text"], counts)
        context_spans[code] = []
        for span in item.get("context", []):
            prior = span.get("turn")
            if type(prior) is not int or not 1 <= prior < target["turn"]:
                counts["invalid_spans"] += 1
                continue
            context_spans[code].extend(validated_span(span, turns[prior - 1]["text"], counts))
    for item in output.get("contextObservations", []):
        validated_span(item, target["text"], counts)

    recognition = {item["code"]: item for item in output.get("recognition", output["findings"])}
    decisions = expected["decisions"]
    rows = {}
    for code in codes:
        reference = decisions.get(code, "unassessed")
        prediction = recognition.get(code, {}).get("status", "no_signal")
        rows[code] = {"reference": reference, "prediction": prediction}
        counts[f"{code}_{reference}_{prediction}"] += 1
        if code not in expected["evidence"]:
            continue
        evidence = expected["evidence"][code]
        if code == "A7" and reference == "present":
            counts["A7_subtype_references"] += 1
            counts["A7_subtype_matches"] += (
                prediction == "present" and recognition[code].get("retentionKind") == evidence["retentionKind"]
            )
        bucket = "" if reference == "present" else "uncertain_"
        matched = prediction == reference == grounded_predictions.get(code)
        if evidence["quote"]:
            anchored = compare_quote(counts, f"{bucket}target", target["text"], evidence["quote"],
                                     target_spans.get(code, []) if matched else [])
            if reference == "present" and anchored:
                counts[f"{code}_grounded_tp"] += 1
        for span in evidence["context"]:
            prior = span["turn"]
            matching = [item for item in context_spans.get(code, []) if item["turn"] == prior]
            compare_quote(counts, f"{bucket}context", turns[prior - 1]["text"], span["quote"],
                          matching if matched else [])

    counts["reviewed_targets"] = int(bool(decisions))
    counts["retention_targets"] = int("A7" in codes)
    counts["fully_reviewed_targets"] = int(len(decisions) == len(codes))
    counts["recognized_targets"] = int(bool(decisions) and all(
        row["reference"] == "unassessed" or
        row["prediction"] == ("no_signal" if row["reference"] == "absent" else row["reference"])
        for row in rows.values()
    ))
    counts["exact_targets"] = int(counts["fully_reviewed_targets"] and counts["recognized_targets"])
    counts["grounded_targets"] = int(counts["recognized_targets"]
        and counts["target_anchored"] == counts["target_references"]
        and counts["uncertain_target_anchored"] == counts["uncertain_target_references"]
        and counts["A7_subtype_matches"] == counts["A7_subtype_references"])
    return dict(counts), rows


@metric
def focused_summary() -> Metric:
    def summarize(scores: list[SampleScore]) -> dict[str, float]:
        totals = Counter()
        for sample in scores:
            totals.update(sample.score.value)

        results = {key: float(totals[key]) for key in (
            "targets", "reviewed_targets", "fully_reviewed_targets", "exact_targets",
            "valid_spans", "invalid_spans", "rejected_findings", "recognized_targets", "grounded_targets",
        )}
        for bucket in ("target", "context", "uncertain_target", "uncertain_context"):
            for field in ("references", "exact", "overlap", "anchored"):
                key = f"{bucket}_{field}"
                results[key] = float(totals[key])

        scope = FULL_CODES if totals["retention_targets"] else CODES
        if totals["retention_targets"]:
            results["A7_subtype_references"] = totals["A7_subtype_references"]
            results["A7_subtype_matches"] = totals["A7_subtype_matches"]
        for code in (code for codes in scope.values() for code in codes):
            tp = totals[f"{code}_present_present"]
            fp = totals[f"{code}_absent_present"]
            fn = totals[f"{code}_present_no_signal"] + totals[f"{code}_present_uncertain"]
            results.update({f"{code}_tp": tp, f"{code}_fp": fp, f"{code}_fn": fn})
            results[f"{code}_grounded_tp"] = totals[f"{code}_grounded_tp"]
            if tp + fp:
                results[f"{code}_precision"] = tp / (tp + fp)
            if tp + fn:
                results[f"{code}_recall"] = tp / (tp + fn)
            results[f"{code}_correct_absent"] = totals[f"{code}_absent_no_signal"]
            results[f"{code}_unexpected_uncertain"] = totals[f"{code}_absent_uncertain"]
            for prediction in ("present", "uncertain", "no_signal"):
                for reference in ("uncertain", "unassessed"):
                    key = f"{code}_{reference}_{prediction}"
                    results[key] = totals[key]
        families = {}
        for sample in scores:
            meta = sample.sample_metadata or {}
            if meta.get("include_retention"):
                families.setdefault((meta["packet"], meta["family"]), []).append(sample)
        complete = [family for family in families.values()
                    if len({row.sample_metadata["conversation_id"] for row in family}) > 1
                    and len(family) == family[0].sample_metadata["family_target_count"]
                    and all(row.score.value["reviewed_targets"] for row in family)]
        if families:
            results["contrast_families_graded"] = len(complete)
            results["contrast_families_recognized"] = sum(all(row.score.value["recognized_targets"] for row in family)
                                                           for family in complete)
            results["contrast_families_passed"] = sum(all(row.score.value["grounded_targets"] for row in family)
                                                       for family in complete)
        return results
    return summarize


@scorer(metrics=[focused_summary()])
def focused_evidence() -> Scorer:
    async def score(state: TaskState, target: Target) -> Score:
        answer = state.output.completion
        counts, rows = score_prefix(
            json.loads(state.input_text)["turns"], json.loads(target.text), json.loads(answer),
            include_retention=bool(state.metadata.get("include_retention")),
        )
        return Score(value=counts, answer=answer, metadata={"decisions": rows})
    return score


@task
def focused_chat_judge(
    packet: str = "benchmark/focused-pilot.json", review: str = "",
    split_file: str = "", split: str = "", detector: str = "rules", target_evidence: bool = False,
) -> Task:
    return Task(
        dataset=focused_dataset(packet, review, split_file, split),
        solver=focused_detector(detector, target_evidence),
        scorer=focused_evidence(),
    )
