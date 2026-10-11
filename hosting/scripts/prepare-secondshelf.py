"""Port owned SecondShelf files into the hosted Worker; never copy runtime data."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
store = root / 'core/store.js'
text = store.read_text(encoding='utf-8')
text = re.sub(r"import \{ existsSync.*?from 'node:fs';\n", '', text)
text = text.replace("import { dirname } from 'node:path';\n", '')
text = re.sub(r'constructor\(file\)\{.*?\n  save\(next\)\{.*?\n', "constructor(){this.state={version:1,drafts:[],lists:[]};}\n  save(next){this.state=next;}\n", text, flags=re.S)
store.write_text(text, encoding='utf-8')
app = root / 'public/app.js'
text = app.read_text(encoding='utf-8')
text = re.sub(r'^async function api\(path,payload\).*?\n', '', text, flags=re.M)
text = text.replace("'Local planner · Qloo event key configured'", "'Hosted planner · Qloo key configured, live verification pending'")
text = text.replace("'Sample mode · no Qloo account connected'", "'Hosted sample · Qloo key pending'")
text = text.replace('the local server', 'the hosted planner').replace('Local planner unavailable', 'Planner unavailable')
app.write_text(text, encoding='utf-8')
html = root / 'public/index.html'
text = html.read_text(encoding='utf-8').replace('<script src="/app.js" defer>', '<script src="/hosted-client.js" defer></script><script src="/app.js" defer>')
text = text.replace('Checking the local planner', 'Opening the hosted planner')
text = text.replace('A working local demo', 'Hosted development demo').replace('Real Qloo access and public hosting are still required before this becomes a qualifying hackathon submission.', 'Sample discovery works here. An issued Qloo key and a verified live workflow are still required for the final entry.')
text = text.replace('Qloo Agentic Hackathon / local build', 'Qloo Agentic Hackathon / hosted development build')
text = text.replace('<footer>', '<p class="notices">Approved lists and favourites are saved in this browser only. No library stock is changed. Export your evidence before clearing browser data. <button class="text-button" id="clear-saved" type="button">Clear saved demo lists</button> · <a href="https://github.com/Vcode2407/qloo-secondshelf">Public source and setup</a></p><footer>')
html.write_text(text, encoding='utf-8')
