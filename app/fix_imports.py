import os

directory = '/home/bek/moil/syntax/offline_cafe_system/app/src'
bad_import = 'import { uuidToDisplayId } from "@/lib/utils";\n'
bad_import_no_nl = 'import { uuidToDisplayId } from "@/lib/utils";'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if bad_import in content or bad_import_no_nl in content:
                # Remove all occurrences
                new_content = content.replace(bad_import, '')
                new_content = new_content.replace(bad_import_no_nl, '')
                
                # Add it cleanly to the top
                final_content = bad_import + new_content
                
                with open(filepath, 'w') as f:
                    f.write(final_content)
                print(f"Fixed {filepath}")
