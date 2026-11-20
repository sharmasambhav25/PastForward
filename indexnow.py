"""Tell IndexNow search engines (Bing and others) that every page in the sitemap has changed.
Run after a deploy is live:  python3 indexnow.py
"""
import json, re, urllib.request

site = json.load(open('src/site.json'))
key, host = site['indexNow']['key'], site['url'].split('//')[1].rstrip('/')
urls = re.findall(r'<url><loc>([^<]+)</loc>', open('docs/sitemap.xml').read())
body = json.dumps({'host': host, 'key': key, 'keyLocation': f"{site['url'].rstrip('/')}/{key}.txt", 'urlList': urls}).encode()
req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body,
                             headers={'Content-Type': 'application/json; charset=utf-8'})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f'IndexNow: {r.status} for {len(urls)} URLs')
except urllib.error.HTTPError as e:
    print(f'IndexNow: {e.code} {e.read()[:200]!r}')
