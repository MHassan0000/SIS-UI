"""Package runtime files only; never include local credentials or student samples."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
extension = root / 'extension'
dist = root / 'dist'
dist.mkdir(exist_ok=True)
manifest = json.loads((extension / 'manifest.json').read_text())
files = ['manifest.json', 'config.js', 'background.js', 'core.js', 'student.js',
         'popup.html', 'popup.css', 'popup.js', 'privacy.html', 'THIRD_PARTY_NOTICES.txt',
         'vendor/parse5.js', 'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png']
archive = dist / 'resultcard-cloud-backup.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as output:
    for name in files:
        output.write(extension / name, name)
with ZipFile(archive) as output:
    assert output.testzip() is None
    assert set(output.namelist()) == set(files)
print(f'Created {archive.name} — v{manifest["version"]}, {len(files)} runtime files, {archive.stat().st_size} bytes.')
