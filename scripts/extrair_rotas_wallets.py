from __future__ import annotations

import re
from pathlib import Path

BASE = Path('/tmp/dwallet_bundles')
KEYWORDS = [
    'wallet', 'market', 'offer', 'request', 'checkout', 'cart', 'transaction',
    'dashboard', 'business', 'personal', 'profile', 'verify', 'data', 'plan',
    'earning', 'home', 'login', 'password', 'email', 'setting', 'company',
    'product', 'payment', 'notification', 'consent', 'dsp', 'subscription',
]

for host in ['br.personal.drumwave.me', 'br.business.drumwave.me']:
    print(f'\n### {host}')
    files = sorted(BASE.glob(f'{host}_*'))
    text = '\n'.join(p.read_text(errors='ignore') for p in files if p.is_file())
    routes = set(re.findall(r'["\'](/(?:[a-zA-Z0-9_\-]+/?){1,6})["\']', text))
    labels = set(re.findall(r'["\']([^"\']{3,80}(?:Wallet|dWallet|Marketplace|Offers|Requests|Verification|Business|Personal|Checkout|Cart|Data|Profile|Settings|Plan|Subscription|Transaction)[^"\']{0,80})["\']', text, flags=re.IGNORECASE))
    selected_routes = sorted(r for r in routes if any(k in r.lower() for k in KEYWORDS))
    for route in selected_routes[:300]:
        print(route)
    print('\n-- labels --')
    for label in sorted(labels)[:150]:
        print(label[:180])
