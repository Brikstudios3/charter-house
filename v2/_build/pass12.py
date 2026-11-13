"""Pass 12 (draft): content from the BRIK website (Sanity) and the website brief.
Trustpilot reviews carousel, FAQ, the project film, BRIK track-record stats."""
import os, json, html

HERE = os.path.dirname(os.path.abspath(__file__))


def js(s):
    """Escape for a JS template literal."""
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def apply(s, rep):
    site = json.load(open(f"{HERE}/site.json", encoding="utf-8"))
    rv = json.load(open(f"{HERE}/reviews.json", encoding="utf-8"))
    e = lambda x: html.escape(x, quote=True)

    star = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.5 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z"/></svg>'
    stars = '<span class="tpstars" aria-label="5 out of 5 stars">' + star * 5 + '</span>'
    cards = "".join(
        f'<article class="tpcard"><div class="tpcard-top">{stars}</div>' + (f'<h4>{e(t)}</h4>' if t else '') + f'<p>{e(b)}</p>'
        f'<div class="tpby"><b>{e(n)}</b><a href="{e(u)}" target="_blank" rel="noopener">Read on Trustpilot</a></div></article>'
        for t, b, n, u in rv["reviews"])
    TP = (f'<section class="sec tpsec"><div class="tphead"><div><div class="cap">What our clients say</div>'
          f'<h3 class="big-h">Rated {e(rv["label"])} on Trustpilot.</h3>' + (f'<p class="tpscore">TrustScore <b>{e(rv["score"])}</b> out of 5 from {e(rv["count"])} reviews</p>' if rv.get("score") else '') + '</div>'
          f'<a class="tpbadge" href="{e(rv["link"])}" target="_blank" rel="noopener" aria-label="BRIK Studios on Trustpilot"><b>{e(rv["label"])}</b>{stars}<i class="tplogo" role="img" aria-label="Trustpilot"></i></a></div>'
          f'<div class="tpwrap"><div class="tptrack" tabindex="0" aria-label="Client reviews, scroll sideways">{cards}</div>'
          f'<div class="tpnav"><button class="tparr prev" aria-label="Previous reviews"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>'
          f'<button class="tparr next" aria-label="More reviews"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div></div></section>')

    FAQ = ('<section class="sec faqsec"><div class="faqgrid"><div class="faqlead"><div class="cap">Before you reserve</div>'
           '<h3 class="big-h">Frequently asked questions.</h3><p>The questions investors ask us most. Can\'t see yours? Message us and we\'ll come straight back to you.</p>'
           '</div><div class="faqlist">'
           + "".join(f'<details class="faq"><summary>{e(q)}<i aria-hidden="true"></i></summary><p>{e(a)}</p></details>' for q, a in site["faq"])
           + '</div></div></section>')

    f = site["film"]
    FILM = (f'<section class="filmsec"><button class="film" data-film="{f["id"]}" style="background-image:var(--{f["poster"]})" aria-label="Watch the {e(site["name"])} film, {f["dur"]}">'
            f'<span class="filmtxt"><span class="cap">A closer look</span><b>{e(site["name"])}, Stockport</b>'
            f'<span class="filmbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>Watch the film · {f["dur"]}</span><small>Plays with sound</small></span></button></section>')

    STATS = ('<div class="bbstats">' + "".join(f'<div><b>{e(v)}</b><span>{e(l)}</span></div>' for v, l in rv["stats"]) + '</div>')

    hr = site["howread"]
    HOWREAD = (f'<section class="howread"><i class="hrscroll" aria-hidden="true"><b></b></i><div><div class="cap">{e(hr["cap"])}</div><h3 class="hrh">{e(hr["h"])}</h3>'
               + "".join(f"<p>{e(x)}</p>" for x in hr["p"]) + '</div></section>')
    defs = ("const TP=`" + js(TP) + "`;\nconst FAQ=`" + js(FAQ) + "`;\nconst FILM=`" + js(FILM) + "`;\nconst HOWREAD=`" + js(HOWREAD) + "`;\n")
    s = rep(s, "const CH={};", defs + "const CH={};", label="p12 defs")
    # film in the overview, before the seven-step map
    s = s.replace('${id==="overview"?CASEMAP+JUMP:""}', '${id==="overview"?FILM+HOWREAD+CASEMAP+JUMP:""}')
    s = s.replace('(id==="overview"?CASEMAP+JUMP:"")', '(id==="overview"?FILM+HOWREAD+CASEMAP+JUMP:"")')
    # reviews and FAQ at the end of Next steps, after the hands-off banner
    s = rep(s, '+nextTab()+howBlocks()};', '+nextTab()+howBlocks()+TP+FAQ};', label="p12 next")
    # BRIK track record in numbers, from the website
    s = rep(s, '<h3 class="bbh">Who\'s behind BRIK.</h3></div></div>',
            '<h3 class="bbh">Who\'s behind BRIK.</h3></div></div>' + STATS, label="p12 stats")
    css_vars = ':root{--' + f["poster"] + ':url("{{P}}' + f["poster"] + '.webp");--tplogo:url("{{P}}trustpilot.png")}'
    return s, css_vars
