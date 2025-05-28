# ORP Highlighting Test

This is a test document to verify the ORP (Optimal Recognition Point) highlighting functionality.

## Test Words

Here are some test words of different lengths:

- **Short words**: I, to, cat, dog, run
- **Medium words**: quick, brown, jumps, reading, speed
- **Long words**: understanding, implementation, speedreading, recognition

## Example Sentences

The quick brown fox jumps over the lazy dog. This sentence contains words of various lengths to test the ORP highlighting algorithm.

Speed reading techniques help improve reading efficiency by focusing on the optimal recognition point of each word.

## Expected ORP Positions

Based on the formula `Math.floor(word.length * 0.3)`:

- "cat" (3 chars) → position 0 → **c**at
- "quick" (5 chars) → position 1 → q**u**ick  
- "reading" (7 chars) → position 2 → re**a**ding
- "understanding" (13 chars) → position 3 → und**e**rstanding

The highlighted character should appear in bold with the selected color (default red #ff4444).
