#!/usr/bin/env python3
import html
import re
import urllib.request
from datetime import date, timedelta
from pathlib import Path

USERNAME = "Niyants101"
OUT = Path(__file__).resolve().parents[1] / "assets" / "night-shift.svg"


def contribution_levels():
    url = f"https://github.com/users/{USERNAME}/contributions"
    request = urllib.request.Request(url, headers={"User-Agent": "night-shift-profile"})
    try:
        page = urllib.request.urlopen(request, timeout=20).read().decode("utf-8")
        found = {
            day: int(level)
            for day, level in re.findall(
                r'data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"', page
            )
        }
    except Exception:
        found = {}

    today = date.today()
    start = today - timedelta(days=364)
    return [found.get((start + timedelta(days=i)).isoformat(), 0) for i in range(365)]


def windows(levels):
    colors = ["#172033", "#123a54", "#145d68", "#19a68c", "#70f0bd"]
    result = []
    for i, level in enumerate(levels):
        col = i // 7
        row = i % 7
        x = 86 + col * 19
        y = 260 + row * 19
        result.append(
            f'<rect class="window level-{level}" x="{x}" y="{y}" width="12" height="12" rx="2" fill="{colors[level]}"/>'
        )
    return "\n".join(result)


def main():
    levels = contribution_levels()
    total = sum(1 for level in levels if level)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520" role="img" aria-labelledby="title desc">
<title id="title">Niyant's Night Shift</title>
<desc id="desc">An animated pixel city where a masked robotics vigilante grapples above Niyant's GitHub contribution windows.</desc>
<style>
  text {{ font-family: "Courier New", monospace; }}
  .rain {{ animation: fall 1.1s linear infinite; }}
  .rain2 {{ animation: fall 1.45s linear infinite; animation-delay: -.6s; }}
  .hero {{ animation: patrol 7s ease-in-out infinite; transform-origin: 0 0; }}
  .cape {{ animation: cape .42s ease-in-out infinite alternate; transform-origin: 25px 16px; }}
  .grapple {{ stroke-dasharray: 10 7; animation: cable .8s linear infinite; }}
  .scanner {{ animation: scan 3s ease-in-out infinite; }}
  .eye {{ animation: blink 4s steps(1) infinite; }}
  .level-4, .level-3 {{ animation: glow 2.2s ease-in-out infinite alternate; }}
  .signal {{ animation: pulse 1.6s ease-out infinite; transform-origin: 1061px 399px; }}
  @keyframes fall {{ from {{ transform: translateY(-90px); }} to {{ transform: translateY(110px); }} }}
  @keyframes patrol {{ 0%, 12% {{ transform: translate(0,0); }} 48%, 62% {{ transform: translate(560px,-115px) rotate(-4deg); }} 88%,100% {{ transform: translate(0,0); }} }}
  @keyframes cape {{ from {{ transform: skewY(-5deg); }} to {{ transform: skewY(12deg); }} }}
  @keyframes cable {{ to {{ stroke-dashoffset: -34; }} }}
  @keyframes scan {{ 0%,100% {{ transform: translateX(0); opacity:.2; }} 50% {{ transform: translateX(968px); opacity:.8; }} }}
  @keyframes blink {{ 0%,94%,100% {{ opacity:1; }} 96%,98% {{ opacity:0; }} }}
  @keyframes glow {{ from {{ opacity:.68; }} to {{ opacity:1; }} }}
  @keyframes pulse {{ 0% {{ transform:scale(.2); opacity:.8; }} 100% {{ transform:scale(1.7); opacity:0; }} }}
  @media (prefers-reduced-motion: reduce) {{ * {{ animation: none !important; }} }}
</style>
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#050814"/><stop offset="1" stop-color="#111a31"/></linearGradient>
  <radialGradient id="moon"><stop stop-color="#d8fff5"/><stop offset="1" stop-color="#75c8c1"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
</defs>
<rect width="1200" height="520" rx="18" fill="url(#sky)"/>
<circle cx="1030" cy="100" r="54" fill="#6debd2" opacity=".12" filter="url(#soft)"/>
<circle cx="1030" cy="100" r="34" fill="url(#moon)"/>
<path d="M1007 80h18v8h-10v13h-8zM1035 109h22v8h-22z" fill="#a9ddd5" opacity=".65"/>

<g fill="#172038">
  <path d="M0 250h70v-53h60v53h45V165h82v85h42V207h55v43h43V137h92v113h51v-76h73v76h44v-42h70v42h38V125h99v125h45v-68h76v68h55v-99h92v99h68v270H0z"/>
</g>
<g fill="#0b1020">
  <path d="M0 330h82V225h93v105h42V184h110v146h61V242h105v88h56V202h129v128h43V151h122v179h54V217h102v113h54V190h118v140h50v190H0z"/>
</g>

<text x="70" y="78" fill="#eafff9" font-size="42" font-weight="700" letter-spacing="3">NIYANT SITHAMRAJU</text>
<text x="73" y="113" fill="#70f0bd" font-size="20" letter-spacing="8">ROBOTICS</text>
<path d="M73 130h324" stroke="#70f0bd" stroke-width="3"/>
<text x="921" y="170" fill="#628294" font-size="12">NIGHT SHIFT ACTIVE</text>

<g opacity=".45" stroke="#73c9d4" stroke-width="2">
  <g class="rain">{''.join(f'<path d="M{x} {20 + (x % 95)}l-8 24"/>' for x in range(30,1200,72))}</g>
  <g class="rain2">{''.join(f'<path d="M{x} {65 + (x % 70)}l-7 21"/>' for x in range(65,1200,89))}</g>
</g>

<g aria-label="GitHub contribution windows">
{windows(levels)}
</g>
<rect class="scanner" x="78" y="252" width="3" height="147" fill="#70f0bd" opacity=".5"/>
<text x="84" y="426" fill="#6f8496" font-size="13">{html.escape(USERNAME.upper())} // {total} ACTIVE DAYS</text>

<g class="hero" transform="translate(280 176)">
  <path class="grapple" d="M38 12L302 -112" fill="none" stroke="#8ef5dc" stroke-width="3"/>
  <g transform="translate(0 0)">
    <path class="cape" d="M24 30C5 46 1 87 8 116l42-23-10-65z" fill="#11192b" stroke="#35516b" stroke-width="2"/>
    <path d="M23 15l8-15 8 15 13 6-4 25H20l-4-25z" fill="#151f34" stroke="#70f0bd" stroke-width="2"/>
    <path class="eye" d="M23 27l9 3-9 4zm23 0l-9 3 9 4z" fill="#d8fff5"/>
    <path d="M25 46h19l9 45H16z" fill="#1d2c45" stroke="#4b7083" stroke-width="2"/>
    <path d="M27 56h15v10H27z" fill="#70f0bd"/><path d="M30 59h9v4h-9z" fill="#11192b"/>
    <path d="M20 50L1 73l7 7 21-17M48 50l19-15 6 8-22 21" fill="none" stroke="#1d2c45" stroke-width="9"/>
    <path d="M24 90l-8 31M45 90l10 31" stroke="#1d2c45" stroke-width="10"/>
  </g>
</g>

<g transform="translate(1035 380)" aria-label="Robot companion">
  <circle class="signal" cx="26" cy="19" r="23" fill="none" stroke="#70f0bd" stroke-width="2"/>
  <path d="M26 1v10M21 1h10" stroke="#70f0bd" stroke-width="3"/>
  <rect x="4" y="12" width="44" height="34" rx="8" fill="#263a51" stroke="#70f0bd" stroke-width="2"/>
  <rect x="12" y="21" width="28" height="14" rx="4" fill="#08101c"/>
  <circle cx="20" cy="28" r="3" fill="#70f0bd"/><circle cx="32" cy="28" r="3" fill="#70f0bd"/>
  <path d="M13 46v13M39 46v13M4 27h-9M48 27h9" stroke="#56778a" stroke-width="5"/>
</g>

<path d="M0 459h185l21-17h171l16 17h262l22-20h184l19 20h320v61H0z" fill="#050812"/>
<g fill="#70f0bd"><rect x="83" y="469" width="118" height="4"/><rect x="908" y="469" width="206" height="4"/></g>
<text x="70" y="500" fill="#40596b" font-size="12" letter-spacing="2">BUILD // LEARN // PROTECT</text>
</svg>'''
    OUT.write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    main()
