#!/usr/bin/env python3
"""Build the Charter House investment report V2 from the live report.

Takes the live pages (/index.html and /andy/index.html at the repo root), and:
  - moves every embedded base64 image out to v2/assets/img/*.webp (the page drops from ~11.6MB to ~0.3MB)
  - forces the light theme (the live page goes dark when a phone is in dark mode)
  - turns the three tab groups into one continuous scroll, with the tab bar as a scroll-spy nav
  - fixes the rent-growth yield labels (showed 0.1%), updates the Savills forecast to June 2026,
    and labels the simple-average return as such
  - adds the V2 visual skin (skin.css) and its small script (skin.js)
Run from anywhere: python3 v2/_build/build.py
"""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
V2 = os.path.dirname(HERE) if os.path.basename(HERE) == "_build" else "/home/claude/charter-house/v2"
REPO = os.path.dirname(V2)

MISSES = []
def rep(s, old, new, count=1, label=""):
    n = s.count(old)
    if n < 1:
        if os.environ.get("SOFT"):  # report every missing patch instead of stopping at the first
            MISSES.append(label or old[:80]); return s
        sys.exit(f"PATCH NOT FOUND: {label or old[:80]}")
    return s.replace(old, new) if count == 0 else s.replace(old, new, count)


PAYSTACK = ('<div class="paystack">${STOPS.map((st,i)=>`<div class="paycard ${i===ps?"on":""}" data-pc="${i}" aria-hidden="${i!==ps}">'
  '<div class="pcl"><div class="cap">${st.when}, ${st.sub.toLowerCase()}</div><h3 class="pct">${st.title}</h3><div class="pca">${gbp(st.amt)}</div><p class="pcn">${st.note}</p></div>'
  '<div class="pcr"><div class="rows big">${st.rows.map(([a,b])=>`<div><span>${a}</span><span>${gbp(b)}</span></div>`).join("")}</div>'
  '<div class="run"><span>Total paid by this stage</span><b>${gbp(run[i])}</b></div>'
  '<div class="pnav"><button class="b line sm" data-pstep="${Math.max(0,i-1)}" ${i===0?"disabled":""}>Back</button>${i<2?`<button class="b solid sm pnext" data-pstep="${i+1}">Next: ${STOPS[i+1].when}</button>`:`<button class="b solid sm" data-call>Book a video call</button>`}</div></div>'
  '</div>`).join("")}</div>')

def hpi_chart():
    import json as _j
    pts = _j.load(open(os.path.join(HERE, "stockport_hpi.json")))
    W, H, L, R, T, B = 640, 340, 64, 22, 72, 42
    lo, hi = 200000, 325000
    n = len(pts)
    X = lambda i: L + i * (W - L - R) / (n - 1)
    Y = lambda v: T + (hi - v) * (H - T - B) / (hi - lo)
    line = " ".join(f"{X(i):.1f},{Y(v):.1f}" for i, (_, v) in enumerate(pts))
    area = f"{X(0):.1f},{Y(lo):.1f} " + line + f" {X(n-1):.1f},{Y(lo):.1f}"
    grid = "".join(f'<line x1="{L}" x2="{W-R}" y1="{Y(v):.1f}" y2="{Y(v):.1f}" class="hg"/><text x="{L-10}" y="{Y(v)+4:.1f}" class="hy">£{v//1000}k</text>' for v in range(lo, hi + 1, 25000))
    xl = "".join(f'<text x="{X(i):.1f}" y="{H-14}" class="hx">{m[:4]}</text><line x1="{X(i):.1f}" x2="{X(i):.1f}" y1="{Y(lo):.1f}" y2="{Y(lo)+5:.1f}" class="ht"/>' for i, (m, _) in enumerate(pts) if m.endswith("-01"))
    mon = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    lab = lambda m: f"{mon[int(m[5:])-1]} {m[:4]}"
    i5 = [k for k, (m, _) in enumerate(pts) if m == "2021-03"][0]
    e_m, e_v = pts[-1]; s_m, s_v = pts[0]; f_m, f_v = pts[i5]
    data = _j.dumps([[lab(m), v] for m, v in pts]).replace('"', "&quot;")
    svg = (f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Average house price in Stockport, all property types, from £{s_v:,} in {lab(s_m)} to £{e_v:,} in {lab(e_m)}">'
           f'<defs><linearGradient id="hpig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A44C28" stop-opacity=".22"/><stop offset="1" stop-color="#A44C28" stop-opacity="0"/></linearGradient></defs>'
           f'{grid}{xl}<line x1="{L}" x2="{W-R}" y1="{Y(lo):.1f}" y2="{Y(lo):.1f}" class="hax"/>'
           f'<polygon points="{area}" class="har"/><polyline points="{line}" class="hln" pathLength="1"/>'
           f'<circle cx="{X(0):.1f}" cy="{Y(s_v):.1f}" r="4" class="hpt"/>'
           f'<circle cx="{X(n-1):.1f}" cy="{Y(e_v):.1f}" r="5.5" class="hpt end"/>'
           f'<text x="{X(n-1):.1f}" y="{T-10}" class="he">£{e_v:,}</text>'
           f'<text x="{X(n-1):.1f}" y="{T-42}" class="hm">{lab(e_m)}</text>'
           f'<text x="{X(0)+10:.1f}" y="{Y(lo)-15:.1f}" class="hs">£{s_v:,}</text>'
           f'<g class="hhov" opacity="0"><line class="hvl" y1="{T}" y2="{Y(lo):.1f}"/><circle class="hvd" r="5"/></g>'
           f'<rect class="hhit" x="{L}" y="{T}" width="{W-L-R}" height="{H-T-B}" fill="transparent"/></svg>')
    return (f'<figure class="hpi" data-hpi="{data}" data-l="{L}" data-r="{R}" data-w="{W}" data-t="{T}" data-b="{B}" data-h="{H}" data-lo="{lo}" data-hi="{hi}">'
            f'<figcaption class="hpih"><b>Average house price, Stockport</b><span>All property types, monthly</span></figcaption>'
            f'<div class="hpic">{svg}<div class="htip" aria-hidden="true"><b></b><span></span></div></div>'
            f'<p class="src">Source: HM Land Registry, UK House Price Index. {lab(s_m)} to {lab(e_m)}.</p></figure>')

def build(src, dst, prefix):
    import json
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    s = open(src, encoding="utf-8").read()
    P = prefix + "assets/img/"
    F = prefix + "assets/fonts/"
    # 1. images out of the page
    def sub(m):
        name = m.group(1)
        if not os.path.exists(f"{V2}/assets/img/{name}.webp"):
            sys.exit("missing image " + name)
        return f'--{name}:url("{P}{name}.webp")'
    s, n = re.subn(r'--([a-zA-Z0-9_]+):url\((?:"|\')?data:image/[a-z+\-]+;base64,[A-Za-z0-9+/=]+(?:"|\')?\)', sub, s)
    assert n >= 90, n
    s = re.sub(r'<link rel="icon" href="data:[^"]+">', f'<link rel="icon" href="{P}logo6.webp">', s)
    # 2. light theme always
    s = rep(s, '<html lang="en">', '<html lang="en" data-theme="light">', label="html tag")
    # 2b. remove dark mode entirely: the claude.ai preview and some browsers drop or ignore data-theme,
    #     which let the original dark-mode colours (light text, light logos) apply on the light skin
    js_start = s.find("<script")
    head, tail = s[:js_start], s[js_start:]
    n1 = head.count("(prefers-color-scheme:dark)")
    head = head.replace("(prefers-color-scheme:dark)", "(prefers-color-scheme:dark) and (max-width:0px)")
    n2 = head.count('[data-theme="dark"]')
    head = head.replace('[data-theme="dark"]', '[data-theme="dark-off"]')
    assert n1 >= 7 and n2 >= 5, (n1, n2)
    head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="color-scheme" content="light only">', 1)
    s = head + tail
    # 3. fonts: self-hosted Figtree, Archivo + Besley from Google (Bodoni dropped: too thin to read)
    s = re.sub(r'<link href="https://fonts.googleapis.com/css2\?[^"]+" rel="stylesheet">',
               '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,500;125,600&family=Besley:ital,wght@0,500;0,600;0,700;0,800;1,500&display=swap" rel="stylesheet">'
               f'\n<link rel="preload" href="{F}figtree-400.woff2" as="font" type="font/woff2" crossorigin>', s)
    # 4. one continuous scroll
    i = s.find('function renderMain(){if(!TABS[S.tab])')
    j = s.find('markNav(S.tab)}', i) + len('markNav(S.tab)}')
    assert i > 0 and j > i
    s = s[:i] + ('function renderMain(){if(!TABS[S.tab])S.tab="overview";S.group=groupOf(S.tab)[0];\n'
                 '  $("#view").innerHTML=GROUPS.map(g=>`<div class="ggroup" data-g="${g[0]}">`+g[2].map(id=>`<div class="gsec" id="t-${id}" data-sec="${id}">${T[id]()}${id==="overview"?JUMP:""}</div>`).join("")+`</div>`).join("");\n'
                 '  $("#chg").style.display="";markNav(S.tab);if(window.__v2skin)window.__v2skin()}\n'
                 'function rerender(id){const el=$("#t-"+id);if(!el){renderMain();return}el.innerHTML=T[id]()+(id==="overview"?JUMP:"");if(window.__v2skin)window.__v2skin()}') + s[j:]
    s = rep(s, 'function goTab(id){const g=groupOf(id),same=g[0]===S.group&&$("#t-"+id);S.tab=id;if(!same)renderMain();else markNav(id);\n  const el=g[2][0]===id?$("#view"):$("#t-"+id);const y=el.getBoundingClientRect().top+scrollY-navOff()-6;\n  spyLock=Date.now()+(same&&!RM?4000:300);scrollTo({top:Math.max(0,y),behavior:same&&!RM?"smooth":"auto"});',
            'function goTab(id){const g=groupOf(id);S.tab=id;S.group=g[0];markNav(id);\n  const el=$("#t-"+id)||$("#view");const y=el.getBoundingClientRect().top+scrollY-navOff()-6;\n  spyLock=Date.now()+(!RM?4000:300);scrollTo({top:Math.max(0,y),behavior:!RM?"smooth":"auto"});', label="goTab")
    s = rep(s, 'if(cur!==S.tab){S.tab=cur;markNav(cur);', 'if(cur!==S.tab){S.tab=cur;S.group=groupOf(cur)[0];markNav(cur);', label="spy")
    s = rep(s, 'if(d.mapmode){S.mapOld=d.mapmode==="old";renderMain();return}', 'if(d.mapmode){S.mapOld=d.mapmode==="old";rerender("location");return}', label="mapmode")
    s = rep(s, 'if(d.yr){S.yr=+d.yr;renderMain();return}', 'if(d.yr){S.yr=+d.yr;rerender("returns");return}', label="yr")
    s = rep(s, 'if(d.beds){S.beds=+d.beds;renderMain();return}', 'if(d.beds){S.beds=+d.beds;rerender("returns");return}', label="beds")
    s = rep(s, 'if(d.pstep!==undefined){S.payStep=+d.pstep;renderMain();return}', 'if(d.pstep!==undefined){S.payStep=+d.pstep;rerender("next");return}', label="pstep")
    # 4b. James's BRIK-down: one continuous quote (was a pull quote plus a separate quoted paragraph)
    s, k = re.subn(r'<blockquote>“([^<]*?)”</blockquote>\n  <div class="body" style="margin-top:14px"><p>“([^<]*?)”</p></div>',
                   lambda m: f'<blockquote class="v2q"><p>“{m.group(1)}</p><p>{m.group(2)}”</p></blockquote>', s, count=1)
    if k != 1 and not os.environ.get("SOFT"): sys.exit("PATCH NOT FOUND: james quote")
    # 4c. Stockport price chart: native SVG from HM Land Registry UK HPI (replaces the ONS screenshot)
    s = rep(s, '${IMG("d_graph","Average price, Stockport, 2020 to 2026","pic tall2 graph")}', hpi_chart(), label="hpi chart")
    # 4d. payment timeline: all three stages rendered, pinned while you scroll through them
    s = rep(s, '<div class="ptl">', '<div class="ptlrun"><div class="ptl">', label="ptl open")
    s = rep(s, 'Click each stage to see what you pay and when', 'Scroll to move through each stage, or tap one', label="ptl hint")
    i0 = s.find('<div class="paycard" aria-live="polite">'); i1 = s.find('\n    <p class="fine">Total cash needed for ${u.name}')
    assert 0 < i0 < i1, (i0, i1)
    s = s[:i0] + PAYSTACK + '\n   </div></div>' + s[i1:]
    s = rep(s, 'Please take your own tax and legal advice.</p>\n   </div></section>', 'Please take your own tax and legal advice.</p>\n   </section>', label="ptl close")
    # 4e. essentials panel: the scout mark instead of the building silhouette
    s, k = re.subn(r'<div class="esspanel"><svg class="solid"[^>]*>.*?</svg>', '<div class="esspanel"><span class="mask plogo lg7 essmark" aria-hidden="true"></span>', s, count=1, flags=re.S)
    if k != 1 and not os.environ.get("SOFT"): sys.exit("PATCH NOT FOUND: essentials mark")
    # 4f. gallery moves to the very end of the report
    s = rep(s, r'building:()=>CH.building().replace(/<\/section>$/,"")+galleryTab()+"</section>"', 'building:CH.building', label="gallery out of building")
    s = rep(s, '+`</div>`).join("");\n  $("#chg").style.display="";',
            '+`</div>`).join("")+`<div class="gsec galend" id="t-gallery" data-sec="next">${galleryTab()}</div>`;\n  $("#chg").style.display="";', label="gallery at end")
    # 4g. let the skin size this headline (inline !important forced 28px Bodoni on phones)
    s = s.replace('<h3 class="sh" style="font-size:clamp(28px,3.2vw,38px)!important;margin:6px 0 14px">', '<h3 class="sh" style="margin:6px 0 14px">')
    # 4h. section order: Overview, Building, Location, Why Stockport, Data, Choose, Returns, Next steps, Heritage (then Gallery)
    s = rep(s, 'const GROUPS=[["opportunity","The opportunity",["overview","building","heritage"]],',
               'const GROUPS=[["opportunity","The opportunity",["overview","building"]],', label="groups")
    s = rep(s, '["invest","Your investment",["units","returns","next"]]];',
               '["invest","Your investment",["units","returns","next"]],["more","More",["heritage"]]];', label="groups end")
    for old_n, new_n, title in [("03","09","The building's heritage"),("05","03","Why Stockport"),("06","05","The data"),
                                ("07","06","Choose your apartment"),("08","07","Returns"),("08","07","Return on investment"),("09","08","Next steps")]:
        s = rep(s, f'chh("{old_n}","{title}"', f'chh("{new_n}","{title}"', label="renumber " + title)
    tab = lambda t, n, label, sel="false": f'<button role="tab" data-tab="{t}" aria-selected="{sel}"><span class="tn0">{n}</span>{label}</button>'
    grp = lambda g, lab, tabs, on="": f'<div class="tg{on}" data-g="{g}"><button class="tgl" data-group="{g}">{lab}</button><div class="tgb">{tabs}</div></div>'
    nav = ('<nav class="tabs gtabs" role="tablist" aria-label="Report sections">'
           + grp("opportunity", "The opportunity", tab("overview","01","Overview","true") + tab("building","02","The building"), " on")
           + grp("intel", "Location and intel", tab("stockport","03","Why Stockport") + tab("location","04","Location") + tab("data","05","The data"))
           + grp("invest", "Your investment", tab("units","06","Choose your apartment") + tab("returns","07","Returns") + tab("next","08","Next steps"))
           + grp("more", "More", tab("heritage","09","Heritage")) + '</nav>')
    s, k = re.subn(r'<nav class="tabs gtabs".*?</nav>', lambda m: nav, s, count=1, flags=re.S)
    assert k == 1
    # 4i. sticky bar button
    s = rep(s, '<button class="b cta-s" id="ctaRes">Book a video call</button>', '<button class="b cta-s" id="ctaRes">Book a 3D virtual tour</button>', label="cta label")
    # 4j. developer and architect: one hero image each instead of a three-image grid
    t0 = s.find('<div class="team2">')
    for key in ("dev_hero", "arch_hero"):
        g0 = s.find('<div class="pics3">', t0); g1 = s.find('</div>', g0) + len('</div>')
        assert t0 > 0 and g0 > t0, key
        img, alt, cap = site[key]
        s = s[:g0] + f'<div class="teamhero">${{IMG("{img}","{alt}","thero")}}<p class="thcap">{cap}</p></div>' + s[g1:]
    # 4k. Location: Why the Underbanks first, then map, on foot; tenant profile moves to Returns (rental market)
    a = s.find(' <div class="sec"><div class="cap"><span>Why the Underbanks</span></div>')
    c = s.find(' <div class="sec"><div class="cap"><span>Current tenant profile</span></div>')
    d = s.find(' <div class="sec"><div class="cap"><span>BRIK in the Underbanks</span>')
    assert 0 < a < c < d, (a, c, d)
    why, ten = s[a:c], s[c:d]
    s = s[:a] + s[d:]
    hook = re.search(r'\$\{chh\("\d\d","Location","[^"]*"\)\}\n', s).group(0)
    assert s.count(hook) == 1
    s = s.replace(hook, hook + why.replace('<div class="sec">', '<div class="sec locwhy">', 1))
    ten = ten.replace('<span>Current tenant profile</span>', '<span>Who rents here</span><span>Current tenant profile</span>', 1)
    ev = '<section class="sec"><div class="cap"><span>Rental evidence</span></div>'
    assert s.count(ev) == 1
    e0 = s.find(ev)
    s = s.replace(ev, '<section class="sec"><div class="cap"><span>The rental market</span><span>Proven rents next door</span></div>', 1)
    g = s.find('<section class="sec"><div class="cap"><span>Stockport', e0)
    assert g > e0
    s = s[:g] + ten.strip() + '\n  ' + s[g:]
    # 4l. BRIK in the Underbanks as a green stitched banner
    s = rep(s, ' <div class="sec"><div class="cap"><span>BRIK in the Underbanks</span><span>What we\'ve built on these streets</span></div>',
            ' <div class="sec brikband"><div class="bbhead"><span class="mask plogo lg7 bbscout" aria-hidden="true"></span><div><div class="cap">Our involvement</div><h3 class="bbh">Rooted in the Underbanks.</h3><p class="bbp">We\'ve gone deep on this neighbourhood. We know the Underbanks street by street, we\'ve built businesses here ourselves, and we have the network of developers, investors and tenants that comes with that. ' + site["brik_exclusive"] + '</p></div></div><div class="cap bbsub">What we\'ve built on these streets</div>', label="brikband")
    # 5. data fixes
    s = rep(s, '${pct(v*12/EX.price)}</text>', '${pct(v*12/EX.price*100)}</text>', label="rent yield bug")
    s = rep(s, '<th>Price growth forecast</th><th>2025</th><th>2026</th><th>2027</th><th>2028</th><th>2029</th><th>5 years to 2029</th>',
            '<th>Price growth forecast</th><th>2026</th><th>2027</th><th>2028</th><th>2029</th><th>2030</th><th>5 years to 2030</th>', label="savills head")
    s = rep(s, '<tr class="hi"><td>North West</td><td>5.0%</td><td>7.0%</td><td>6.5%</td><td>4.5%</td><td>3.5%</td><td>29.4%</td></tr><tr><td>London</td><td>3.0%</td><td>4.0%</td><td>3.5%</td><td>3.0%</td><td>2.5%</td><td>17.1%</td></tr><tr><td>UK</td><td>4.0%</td><td>5.5%</td><td>5.0%</td><td>4.0%</td><td>3.0%</td><td>23.4%</td></tr>',
            '<tr class="hi"><td>North West</td><td>0.0%</td><td>3.5%</td><td>6.5%</td><td>6.5%</td><td>6.5%</td><td>25.0%</td></tr><tr><td>UK</td><td>&minus;2.0%</td><td>2.5%</td><td>5.0%</td><td>6.0%</td><td>6.0%</td><td>18.5%</td></tr><tr><td>London</td><td>&minus;4.0%</td><td>1.0%</td><td>3.5%</td><td>5.0%</td><td>5.0%</td><td>10.6%</td></tr>', label="savills rows")
    s = rep(s, 'https://www.savills.co.uk/research_articles/229130/376732-0" target="_blank" rel="noopener">Savills</a>',
            'https://www.savills.co.uk/insight-and-opinion/savills-news/391268/savills-revises-uk-house-price-forecast-as-higher-mortgage-costs-hit-affordability" target="_blank" rel="noopener">Savills, five-year forecast revised June 2026</a>', label="savills link")
    s = rep(s, '<div class="cap">Annualised return</div>', '<div class="cap">Average annual return</div>', label="annualised stat")
    s = rep(s, '<small>on capital deployed, 5-year exit</small>', '<small>on capital deployed, 5-year hold</small>', label="5yr exit")
    s = rep(s, '<div class="cap">Annualised</div>', '<div class="cap">Average a year</div>', label="roi annualised")
    s = rep(s, 'Annualised return is the total return divided by the years held.', 'Average annual return is the total return divided by the years held; it is not compounded.', count=0, label="annualised note")
    # 8. link previews (WhatsApp, iMessage, LinkedIn): proper title, description and a picture
    import json, html as _h
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    url = site["url"] + ("andy/" if "/andy/" in dst else "")
    img = site["url"] + "assets/img/og.jpg"
    esc = lambda x: x.replace("&", "&amp;").replace('"', "&quot;")
    t, d = esc(site["title"]), esc(site["description"])
    s, k = re.subn(r'<title>[^<]*</title>', f'<title>{t}</title>', s, count=1)
    assert k == 1
    s, k = re.subn(r'<meta name="description" content="[^"]*">',
                   f'<meta name="description" content="{d}">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="BRIK Studios">'
                   f'\n<meta property="og:title" content="{t}">\n<meta property="og:description" content="{d}">\n<meta property="og:url" content="{url}">'
                   f'\n<meta property="og:image" content="{img}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">'
                   f'\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="{t}">\n<meta name="twitter:description" content="{d}">\n<meta name="twitter:image" content="{img}">', s, count=1)
    assert k == 1
    og = f"{V2}/assets/img/og.jpg"
    if not os.path.exists(og):
        from PIL import Image
        im = Image.open(f"{V2}/assets/img/{site['og_source']}.webp").convert("RGB")
        w, h = im.size; tw = min(w, round(h * 1200 / 630)); th = round(tw * 630 / 1200)
        im = im.crop(((w - tw) // 2, (h - th) // 2, (w - tw) // 2 + tw, (h - th) // 2 + th)).resize((1200, 630), Image.LANCZOS)
        im.save(og, "JPEG", quality=84, optimize=True, progressive=True)
    # 9. the sales story and the rest of pass 9
    import pass9
    s = pass9.apply(s, rep)
    import pass10
    s = pass10.apply(s, rep)
    import pass12
    s, p12css = pass12.apply(s, rep)
    if os.environ.get("V3"):
        import pass_v3
        s = pass_v3.apply(s, rep)
        p12css += open(f"{HERE}/skin_v3.css", encoding="utf-8").read()
    # 6. skin
    css = (open(f"{HERE}/skin.css", encoding="utf-8").read() + "\n" + p12css).replace("{{F}}", F).replace("{{P}}", P)
    js = open(f"{HERE}/skin.js", encoding="utf-8").read()
    k = s.rfind("</style>")
    s = s[:k] + "\n/* ================= V2 SKIN ================= */\n" + css + "\n" + s[k:]
    k = s.rfind("</body>")
    s = s[:k] + "<script>" + js + "</script>\n" + s[k:]
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "w", encoding="utf-8").write(s)
    print(dst, round(os.path.getsize(dst) / 1024), "KB")

OUT = os.environ.get("OUT", V2)          # where the pages go
PFX = os.environ.get("PFX", "")          # extra path from the output folder to the shared assets
build(f"{HERE}/src/index.html", f"{OUT}/index.html", PFX)
build(f"{HERE}/src/andy/index.html", f"{OUT}/andy/index.html", "../" + PFX)
if MISSES:
    print("MISSES:\n  " + "\n  ".join(dict.fromkeys(MISSES)))
