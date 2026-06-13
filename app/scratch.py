import os
import re

directory = '/home/bek/moil/syntax/offline_cafe_system/app/src'

# Regex patterns to find displayed IDs. We want to avoid matching keys or values.
# Common patterns:
# #{order.id}
# Order #{order.id}
# P-{payment.id}
# {order.id} when inside <span> or similar (but this is harder to regex safely).
# Receipt #: ${order.id}

patterns = [
    (r'#\{([a-zA-Z0-9_]+)\.id\}', r'#{uuidToDisplayId(\1.id)}'),
    (r'Order #\{([a-zA-Z0-9_]+)\.id\}', r'Order #{uuidToDisplayId(\1.id)}'),
    (r'P-\{([a-zA-Z0-9_]+)\.id\}', r'P-{uuidToDisplayId(\1.id)}'),
    (r'Receipt #: \$\{([a-zA-Z0-9_]+)\.id\}', r'Receipt #: ${uuidToDisplayId(\1.id)}'),
    (r'Order #: \$\{([a-zA-Z0-9_]+)\.id\}', r'Order #: ${uuidToDisplayId(\1.id)}'),
    # Specific case for <span>{order.id}</span>
    (r'<span>\{order\.id\}</span>', r'<span>{uuidToDisplayId(order.id)}</span>'),
]

import_statement = 'import { uuidToDisplayId } from "@/lib/utils";\n'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            original_content = content
            changed = False
            
            for pattern, replacement in patterns:
                if re.search(pattern, content):
                    content = re.sub(pattern, replacement, content)
                    changed = True
            
            if changed:
                # Add import if not present
                if 'uuidToDisplayId' not in original_content:
                    # Find the last import line or just add to top
                    imports = re.findall(r'^import .*?;?\n', content, flags=re.MULTILINE)
                    if imports:
                        last_import = imports[-1]
                        content = content.replace(last_import, last_import + import_statement, 1)
                    else:
                        content = import_statement + content
                
                with open(filepath, 'w') as f:
                    f.write(content)
                print(f"Updated {filepath}")
