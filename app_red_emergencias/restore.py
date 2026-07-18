import json
import os

transcript_path = "/Users/maaurors/.gemini/antigravity-ide/brain/0b9a7cc5-0446-45b4-8825-bc70f7dc4f6e/.system_generated/logs/transcript_full.jsonl"
dest_dir = "/Users/maaurors/Desktop/Trabajos Universidad/2do trimestre 2026/Base de datos/Trabajo_BDD_Emergencias/app_red_emergencias/mobile"

files_recovered = {}

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    if call.get('name') == 'write_to_file':
                        args = call.get('args', {})
                        target = args.get('TargetFile', '')
                        if 'red-emergencias-app' in target or 'mobile' in target:
                            filename = target.split('/')[-1]
                            files_recovered[filename] = args.get('CodeContent', '')
        except Exception as e:
            pass

# Now apply multi_replace_file_content modifications
with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for call in data['tool_calls']:
                    name = call.get('name')
                    if name in ['multi_replace_file_content', 'replace_file_content']:
                        args = call.get('args', {})
                        target = args.get('TargetFile', '')
                        filename = target.split('/')[-1]
                        if filename in files_recovered:
                            content = files_recovered[filename]
                            chunks = args.get('ReplacementChunks', [])
                            if not chunks and 'TargetContent' in args: # replace_file_content
                                chunks = [args]
                            for chunk in chunks:
                                target_str = chunk.get('TargetContent', '')
                                replace_str = chunk.get('ReplacementContent', '')
                                if target_str in content:
                                    content = content.replace(target_str, replace_str)
                            files_recovered[filename] = content
        except Exception as e:
            pass

print(f"Recovered {len(files_recovered)} files.")
for name, content in files_recovered.items():
    if name == 'App.js':
        path = os.path.join(dest_dir, name)
    elif name in ['tema.js', 'iconos.js', 'componentes.js', 'api.js']:
        path = os.path.join(dest_dir, 'src', name)
    else:
        path = os.path.join(dest_dir, 'src', 'pantallas', name)
    
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"Restored: {path}")

