"""Extract a filtered display silhouette from the real SHIBUI printing mesh."""
from pathlib import Path
from math import hypot
import json
root=Path(__file__).resolve().parents[1]
source=root.parent/'Lamparas LED/SHIBUI_Rosca_025/OBJ/S01_Pantalla_Rosca.obj'
bins={}
for line in source.open():
    if line.startswith('v '):
        x,y,z=map(float,line.split()[1:4])
        b=round(z/.5)
        bins[b]=max(bins.get(b,0),hypot(x,y))
profile=[]
for k in sorted(bins):
    near=[bins[j] for j in range(k-2,k+3) if j in bins]
    profile.append([round(sum(near)/len(near)*.001,7),round(min(k*.5,128.742599)*.001,7)])
(root/'src/shibui-profile.json').write_text(json.dumps(profile))
