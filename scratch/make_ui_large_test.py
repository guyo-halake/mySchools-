from pathlib import Path

p = Path('scratch/ui-large-test.mp4')
p.parent.mkdir(parents=True, exist_ok=True)
size = 60 * 1024 * 1024
with p.open('wb') as f:
    f.write(b'\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42mp41isom')
    remaining = size - f.tell()
    chunk = b'\x00' * (1024 * 1024)
    while remaining > 0:
        n = min(len(chunk), remaining)
        f.write(chunk[:n])
        remaining -= n
print(p.resolve())
print(p.stat().st_size)
