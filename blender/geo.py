"""Geometry helpers for building stylized bouquet assets with bpy.

Every asset is built into a MeshBuilder (verts / faces / per-vertex gray
shading / material index), then turned into one Blender object whose
material slots carry stable names the web app recolors at runtime:
petal, center, stem, leaf, paper, tissue, ribbon, card, pearl, heart, wing...
"""
import math
import random
import bpy

TAU = math.tau


def v_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def v_mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def v_norm(a):
    l = math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2) or 1.0
    return (a[0] / l, a[1] / l, a[2] / l)


def v_cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def rot_z(p, ang):
    c, s = math.cos(ang), math.sin(ang)
    return (p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2])


class MeshBuilder:
    def __init__(self, materials):
        self.materials = list(materials)
        self.verts, self.faces, self.shade, self.fmat, self.uvs = [], [], [], [], {}

    def mat(self, name):
        return self.materials.index(name)

    def add(self, verts, faces, shade, mat, uvs=None):
        base = len(self.verts)
        self.verts.extend(verts)
        self.shade.extend(shade)
        for f in faces:
            fi = len(self.faces)
            self.faces.append(tuple(i + base for i in f))
            self.fmat.append(self.mat(mat))
            if uvs is not None:
                self.uvs[fi] = [uvs[i] for i in f]

    def merge(self, other, xf):
        """Append another builder's geometry with each vertex passed through xf(p)."""
        base = len(self.verts)
        self.verts.extend(xf(p) for p in other.verts)
        self.shade.extend(other.shade)
        for fi, f in enumerate(other.faces):
            self.faces.append(tuple(i + base for i in f))
            self.fmat.append(self.mat(other.materials[other.fmat[fi]]))

    def build(self, name, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.verts, [], self.faces)
        me.update()
        for i, poly in enumerate(me.polygons):
            poly.material_index = self.fmat[i]
            poly.use_smooth = smooth
        col = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        for i, g in enumerate(self.shade):
            if isinstance(g, tuple):
                col.data[i].color = (g[0], g[1], g[2], 1.0)
            else:
                col.data[i].color = (g, g, g, 1.0)
        me.color_attributes.active_color = col
        uv = me.uv_layers.new(name="UVMap")
        for i, poly in enumerate(me.polygons):
            face_uv = self.uvs.get(i)
            for k, li in enumerate(poly.loop_indices):
                uv.data[li].uv = face_uv[k] if face_uv else (0.0, 0.0)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        for m in self.materials:
            ob.data.materials.append(get_material(m))
        return ob


PREVIEW = {
    "petal": (0.85, 0.18, 0.3), "petal2": (0.95, 0.85, 0.9), "center": (0.95, 0.7, 0.1),
    "stem": (0.25, 0.45, 0.18), "leaf": (0.22, 0.42, 0.2), "paper": (0.72, 0.55, 0.38),
    "tissue": (0.97, 0.9, 0.9), "ribbon": (0.8, 0.2, 0.3), "card": (0.98, 0.97, 0.94),
    "heart": (0.9, 0.2, 0.35), "wing": (0.4, 0.6, 0.95), "body": (0.15, 0.12, 0.1),
    "bud": (0.95, 0.95, 0.95), "pick": (0.75, 0.6, 0.4), "husk": (0.45, 0.3, 0.18), "fur": (0.62, 0.42, 0.26), "muzzle": (0.86, 0.72, 0.56), "nose": (0.1, 0.07, 0.06), "eye": (0.05, 0.04, 0.04), "foil": (0.85, 0.65, 0.2), "cup": (0.35, 0.2, 0.1), "velvet": (0.55, 0.05, 0.12), "satin": (0.95, 0.92, 0.88), "gold": (0.9, 0.7, 0.3), "diamond": (0.95, 0.97, 1.0),
    "bark": (0.36, 0.25, 0.2), "blossom": (0.98, 0.72, 0.8), "wood": (0.62, 0.42, 0.26), "metal": (0.12, 0.13, 0.13),
    "paint": (0.95, 0.94, 0.9), "climb": (0.93, 0.45, 0.55), "glass": (1.0, 0.85, 0.55), "hedge": (0.25, 0.45, 0.22), "stone": (0.72, 0.7, 0.66),
}


def get_material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    c = PREVIEW.get(name, (0.8, 0.8, 0.8))
    bsdf.inputs["Base Color"].default_value = (*c, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.6
    # Preview wiring: gray vertex shading multiplied with the preview color.
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs[6].default_value = (*c, 1.0)
    nt.links.new(attr.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    m.use_backface_culling = False
    return m


def unwire_for_export():
    """glTF only needs names + COLOR_0; drop the preview multiply nodes."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        for link in list(nt.links):
            if link.to_node == bsdf and link.to_socket.name == "Base Color":
                nt.links.remove(link)
        bsdf.inputs["Base Color"].default_value = (*PREVIEW.get(m.name, (0.8, 0.8, 0.8)), 1.0)


# ---------------------------------------------------------------- petals

def petal(mb, mat, *, L, W, alpha, azim, r0=0.0, h0=0.0, cup=0.4, curl=0.0,
          profile="round", fold=0.0, nu=7, nv=11, shade_base=0.7, shade_tip=1.0,
          twist=0.0, lift=0.0, origin=(0, 0, 0), wave=0.0, seed=0,
          ruffle=0.0, ruffle_freq=9.0, reflex=0.0, notch=0.0, spots=None):
    """A curved petal (or leaf) attached at the flower axis.

    alpha: tilt from vertical (rad). curl: total backward bend along length
    (rad, negative bends inward). cup: cross curvature (edge rises cup*W/2
    toward the flower center). fold: V-fold along the midrib (leaves).
    """
    rng = random.Random(seed)
    jitter = [rng.uniform(-1, 1) for _ in range(4)]

    def width(v):
        if profile == "round":
            return W * math.sin(math.pi * min(1.0, v * 0.92 + 0.08)) ** 0.55 * (0.55 + 0.45 * v)
        if profile == "obovate":  # narrow base, broad rounded top (rose)
            return W * (math.sin(math.pi * v) ** 0.45) * (0.35 + 0.65 * v ** 0.6) * 1.1
        if profile == "strap":  # daisy ray floret
            return W * math.sin(math.pi * v) ** 0.25
        if profile == "pointed":  # sunflower ray / leaf
            return W * math.sin(math.pi * v ** 0.85) ** 0.9
        if profile == "egg":  # tulip
            return W * math.sin(math.pi * (v * 0.96 + 0.04) ** 0.75) ** 0.6
        if profile == "disc":  # eucalyptus
            return W * math.sqrt(max(0.0, 1 - (2 * v - 1) ** 2))
        if profile == "fan":  # peony / poppy / carnation: narrow claw, very broad top
            return W * (math.sin(math.pi * min(1.0, v * 0.86 + 0.14)) ** 0.35) * (0.18 + 0.82 * v ** 0.5)
        if profile == "broad":  # rounded, blunt tip (peony)
            k = max(0.0, (v - 0.5) / 0.5)
            return W * (0.28 + 0.72 * v ** 0.45) * math.sqrt(max(0.0, 1 - k ** 2.2))
        if profile == "lance":  # lily / orchid sepal
            return W * math.sin(math.pi * v ** 0.7) ** 1.1
        raise ValueError(profile)

    d = (math.sin(alpha), 0.0, math.cos(alpha))  # along (radial-up)
    n = (-math.cos(alpha), 0.0, math.sin(alpha))  # toward axis
    t = (0.0, 1.0, 0.0)

    # integrate the spine in (along, normal) space
    spine = [(0.0, 0.0, 0.0)]  # (a, nrm, phi)
    a = nn = 0.0
    for j in range(1, nv + 1):
        v = j / nv
        phi = curl * v ** 1.6
        a += math.cos(phi) * L / nv
        nn -= math.sin(phi) * L / nv
        spine.append((a, nn, phi))

    verts, shade, uvs = [], [], []
    for j in range(nv + 1):
        v = j / nv
        sa, sn, phi = spine[j]
        T = (math.cos(phi), -math.sin(phi))
        N = (math.sin(phi), math.cos(phi))
        w = width(v)
        tw = twist * v
        for i in range(nu + 1):
            u = i / nu * 2 - 1
            x = u * w / 2
            off = cup * (u * u) * (w / 2) + fold * abs(u) * (w / 2)
            off += wave * math.sin(u * 5 + jitter[0] * 3) * v * w * 0.15
            # ruffled / frilled margin: strongest toward the outer edge and tip
            edge = max(abs(u), v ** 2) ** 2
            off += ruffle * math.sin(ruffle_freq * (u * 1.7 + v * 0.8) + jitter[1] * 4) * edge * w * 0.5
            # reflexed edges: the margins near the tip roll back away from the flower center
            off -= reflex * (abs(u) ** 2.5) * (v ** 2.2) * w
            # rotate the cross section slightly for twist
            xx = x * math.cos(tw)
            oo = off + x * math.sin(tw)
            along_extra = 0.0
            if notch:  # heart-shaped tip (anemone, poppy)
                along_extra = -notch * L * (1 - abs(u)) ** 3 * v ** 6
            pa = sa + N[0] * oo + T[0] * along_extra
            pn = sn + N[1] * oo + T[1] * along_extra + lift * v * v * L
            p = v_add(v_add(v_mul(d, pa), v_mul(n, pn)), v_mul(t, xx))
            p = (p[0] + r0, p[1], p[2] + h0)
            p = rot_z(p, azim)
            verts.append(v_add(p, origin))
            g = shade_base + (shade_tip - shade_base) * (v ** 0.7)
            g *= 1.0 - 0.06 * (u * u)
            if spots:  # lily freckles: darker dots near the throat
                cnt, reach = spots
                if v < reach and math.sin(u * cnt * 3.1 + jitter[2] * 9) * math.sin(v * cnt * 4.3 + jitter[3] * 7) > 0.72:
                    g *= 0.35
            shade.append(g)
            uvs.append((i / nu, v))
    faces = []
    row = nu + 1
    for j in range(nv):
        for i in range(nu):
            a0 = j * row + i
            faces.append((a0, a0 + 1, a0 + row + 1, a0 + row))
    mb.add(verts, faces, shade, mat)


# ---------------------------------------------------------------- tubes

def tube(mb, mat, path, radius, sides=8, cap_end=True, shade=(0.75, 1.0), up_hint=(1, 0, 0)):
    """Sweep a circle along a polyline. radius may be a float or f(t)."""
    rad = radius if callable(radius) else (lambda _t, r=radius: r)
    verts, sh, faces = [], [], []
    n = len(path)
    prev_side = None
    for k, p in enumerate(path):
        tt = k / (n - 1)
        if k == 0:
            tan = v_sub(path[1], path[0])
        elif k == n - 1:
            tan = v_sub(path[-1], path[-2])
        else:
            tan = v_sub(path[k + 1], path[k - 1])
        tan = v_norm(tan)
        side = v_cross(tan, up_hint) if prev_side is None else prev_side
        side = v_norm(v_sub(side, v_mul(tan, sum(side[i] * tan[i] for i in range(3)))))
        if side == (0, 0, 0):
            side = v_norm(v_cross(tan, (0, 1, 0)))
        prev_side = side
        other = v_cross(tan, side)
        r = rad(tt)
        for s in range(sides):
            ang = s / sides * TAU
            off = v_add(v_mul(side, math.cos(ang) * r), v_mul(other, math.sin(ang) * r))
            verts.append(v_add(p, off))
            sh.append(shade[0] + (shade[1] - shade[0]) * tt)
    for k in range(n - 1):
        for s in range(sides):
            a = k * sides + s
            b = k * sides + (s + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    if cap_end:
        faces.append(tuple(range((n - 1) * sides, n * sides)))
        faces.append(tuple(reversed(range(0, sides))))
    mb.add(verts, faces, sh, mat)


def sphere(mb, mat, center, r, squash=1.0, seg=12, rings=8, shade=(0.6, 1.0), bump=None):
    verts, sh, faces = [], [], []
    for j in range(rings + 1):
        th = math.pi * j / rings
        for i in range(seg):
            ph = TAU * i / seg
            rr = r * (bump(th, ph) if bump else 1.0)
            x = rr * math.sin(th) * math.cos(ph)
            y = rr * math.sin(th) * math.sin(ph)
            z = rr * math.cos(th) * squash
            verts.append((center[0] + x, center[1] + y, center[2] + z))
            sh.append(shade[1] - (shade[1] - shade[0]) * (j / rings))
    for j in range(rings):
        for i in range(seg):
            a = j * seg + i
            b = j * seg + (i + 1) % seg
            faces.append((a, a + seg, b + seg, b))
    mb.add(verts, faces, sh, mat)


def ribbon_strip(mb, mat, path, width, across, shade=(0.8, 1.0), uv=False, twist_fn=None):
    """Flat band swept along `path`; `across` is the width direction (vector or f(t))."""
    verts, sh, faces, uvs = [], [], [], []
    n = len(path)
    for k, p in enumerate(path):
        tt = k / (n - 1)
        ax = across(tt) if callable(across) else across
        ax = v_norm(ax)
        w = width(tt) if callable(width) else width
        for s in (-1, 0, 1):
            off = v_mul(ax, s * w / 2)
            bulge = 0.0
            verts.append(v_add(v_add(p, off), (0, 0, bulge)))
            sh.append(shade[0] + (shade[1] - shade[0]) * (1 - abs(s) * 0.3) * (0.7 + 0.3 * tt))
    for k in range(n - 1):
        for s in range(2):
            a = k * 3 + s
            faces.append((a, a + 1, a + 4, a + 3))
    mb.add(verts, faces, sh, mat)


def bezier_path(pts, steps=24):
    """Catmull-Rom through pts."""
    out = []
    P = [pts[0]] + list(pts) + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in range(3)))
    out.append(pts[-1])
    return out
