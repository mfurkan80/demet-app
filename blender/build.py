"""Build assets: python3 build.py [names...] [--preview] [--export]"""
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import geo  # noqa: E402
import flowers  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PREV = os.path.join(ROOT, "preview")
OUT = os.path.join(ROOT, "assets")
os.makedirs(PREV, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

REGISTRY = dict(flowers.ALL)
import flowers2  # noqa: E402
REGISTRY.update(flowers2.ALL)
GDEC = {"g_bushlo": 0.3}
LOD = {"hydrangea": 0.12, "lavender": 0.18, "gypsophila": 0.3, "peony": 0.15, "ranunculus": 0.16}
try:
    import decor  # noqa: E402
    REGISTRY.update(decor.ALL)
except ImportError:
    pass
import gardenprops  # noqa: E402
REGISTRY.update(gardenprops.ALL)


def bake_ao(ob, samples=48, dist=0.6):
    """Bake ambient occlusion into a temporary color layer and multiply it into Col."""
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    if not sc.world:
        sc.world = bpy.data.worlds.new("w")
    sc.world.light_settings.distance = dist
    me = ob.data
    ao = me.color_attributes.new("AO", "FLOAT_COLOR", "POINT")
    me.color_attributes.active_color = ao
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    sc.render.bake.target = "VERTEX_COLORS"
    bpy.ops.object.bake(type="AO")
    col = me.color_attributes["Col"]
    for i in range(len(col.data)):
        a = ao.data[i].color[0]
        a = 0.35 + 0.65 * a
        c = col.data[i].color
        col.data[i].color = (c[0] * a, c[1] * a, c[2] * a, 1.0)
    me.color_attributes.remove(me.color_attributes["AO"])
    me.color_attributes.active_color = me.color_attributes["Col"]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_render(res=(420, 520), samples=24):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "AgX"
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.95, 0.92, 0.9, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    key = bpy.data.lights.new("key", "AREA")
    key.energy = 120
    key.size = 1.5
    ko = bpy.data.objects.new("key", key)
    ko.location = (1.2, -1.4, 2.4)
    ko.rotation_euler = (math.radians(45), 0, math.radians(40))
    sc.collection.objects.link(ko)


def look_at(cam, target):
    from mathutils import Vector
    d = Vector(target) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(name, target=(0, 0, 0.98), dist=0.55, elev=35, res=(420, 520), lens=50):
    setup_render(res)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = lens
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    e = math.radians(elev)
    cam.location = (target[0], target[1] - dist * math.cos(e), target[2] + dist * math.sin(e))
    look_at(cam, target)
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = os.path.join(PREV, f"{name}.png")
    bpy.ops.render.render(write_still=True)


def export(ob, name):
    geo.unwire_for_export()
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.context.scene.objects:
        if o.type == "MESH":
            o.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f"{name}.glb"), export_format="GLB", use_selection=True,
        export_apply=True, export_vertex_color="ACTIVE", export_all_vertex_colors=False,
        export_normals=True, export_texcoords=True, export_materials="EXPORT", export_yup=True,
        export_animations=False, export_cameras=False, export_lights=False,
    )


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    names = [a for a in args if a in REGISTRY] or ([] if "--thumbs" in sys.argv else list(REGISTRY))
    for name in names:
        reset()
        fn = REGISTRY[name]
        ob = fn()
        meta = getattr(fn, "view", {})
        nt = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        print(f"{name}: {nt} tris")
        if "--preview" in sys.argv:
            render(name, **meta)
        if "--export" in sys.argv:
            if name in GDEC:
                mod = ob.modifiers.new("dec", "DECIMATE")
                mod.ratio = GDEC[name]
                bpy.context.view_layer.objects.active = ob
                bpy.ops.object.modifier_apply(modifier="dec")
                print(f"  decimated: {sum(len(p.vertices) - 2 for p in ob.data.polygons)} tris")
            if name.startswith("g_") and "--noao" not in sys.argv:
                bake_ao(ob, dist=1.2 if name == "g_tree" else 0.4)
            export(ob, name)
        if "--lod" in sys.argv:
            reset()
            ob = fn()
            mod = ob.modifiers.new("dec", "DECIMATE")
            mod.ratio = LOD.get(name, 0.22)
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.modifier_apply(modifier="dec")
            print(f"  lod: {sum(len(p.vertices) - 2 for p in ob.data.polygons)} tris")
            export(ob, name + "_lo")



GOLD = (0.95, 0.68, 0.25)
THUMB = {
    "peony": ({"petal": (0.96, 0.55, 0.62)}, (0, 0, 0.98), 0.42, 40),
    "carnation": ({"petal": (0.82, 0.06, 0.14)}, (0, 0, 0.97), 0.32, 40),
    "ranunculus": ({"petal": (0.98, 0.48, 0.33), "center": (0.45, 0.6, 0.25)}, (0, 0, 0.98), 0.32, 45),
    "lily": ({"petal": (0.98, 0.96, 0.93), "center": (0.6, 0.22, 0.04)}, (0, 0, 0.99), 0.48, 40),
    "calla": ({"petal": (0.98, 0.97, 0.93), "center": (0.95, 0.72, 0.15)}, (0, 0, 0.99), 0.36, 25),
    "anemone": ({"petal": (0.98, 0.98, 0.98), "center": (0.04, 0.04, 0.1)}, (0, 0, 0.98), 0.3, 50),
    "poppy": ({"petal": (0.88, 0.07, 0.05), "center": (0.04, 0.04, 0.04)}, (0, 0, 0.97), 0.34, 45),
    "hydrangea": ({"petal": (0.45, 0.55, 0.92)}, (0, 0, 0.97), 0.42, 30),
    "orchid": ({"petal": (0.98, 0.9, 0.95), "center": (0.8, 0.2, 0.45)}, (0, -0.14, 1.06), 0.44, 20),
    "fern": ({"leaf": (0.25, 0.5, 0.22), "stem": (0.25, 0.45, 0.2)}, (0, 0.05, 0.82), 0.7, 25),
    "cotton": ({"husk": (0.4, 0.26, 0.15), "stem": (0.35, 0.25, 0.18)}, (0, 0, 0.86), 0.38, 20),
    "rose_gold": ({"petal": GOLD}, (0, 0, 0.99), 0.36, 38),
    "rose_night": ({"petal": (0.08, 0.12, 0.45)}, (0, 0, 0.99), 0.36, 38),
    "teddy": ({}, (0, 0, 0.07), 0.3, 15),
    "choco": ({"foil": GOLD}, (0, 0, 0.865), 0.12, 25),
    "ringbox": ({"velvet": (0.5, 0.04, 0.1), "gold": GOLD}, (0, 0.005, 0.035), 0.19, 25),
    "heart": ({"heart": (0.85, 0.08, 0.18)}, (0, 0, 0.0), 0.2, 10),
    "butterfly": ({"wing": (0.45, 0.62, 0.95)}, (0, 0, 0.0), 0.2, 55),

    "rose": ({"petal": (0.55, 0.02, 0.05), "leaf": (0.2, 0.38, 0.15), "stem": (0.2, 0.38, 0.15)}, (0, 0, 0.99), 0.36, 38),
    "tulip": ({"petal": (0.9, 0.3, 0.42), "leaf": (0.25, 0.45, 0.2), "stem": (0.25, 0.45, 0.2)}, (0, 0, 1.06), 0.38, 20),
    "daisy": ({"petal": (0.95, 0.94, 0.9), "center": (0.95, 0.6, 0.05), "leaf": (0.25, 0.45, 0.2), "stem": (0.25, 0.45, 0.2)}, (0, 0, 0.995), 0.34, 55),
    "sunflower": ({"petal": (0.97, 0.6, 0.02), "center": (0.12, 0.05, 0.02), "leaf": (0.2, 0.38, 0.15), "stem": (0.2, 0.38, 0.15)}, (0, 0, 0.98), 0.38, 50),
    "lavender": ({"petal": (0.35, 0.22, 0.65), "stem": (0.3, 0.45, 0.3)}, (0.02, 0, 0.93), 0.4, 15),
    "gypsophila": ({"bud": (0.97, 0.97, 0.95), "stem": (0.3, 0.48, 0.25)}, (0, 0, 0.93), 0.3, 30),
    "eucalyptus": ({"leaf": (0.35, 0.52, 0.45), "stem": (0.4, 0.45, 0.35)}, (0.02, 0, 0.82), 0.72, 15),
}


METAL = {"rose_gold": {"petal": 0.25}, "rose_night": {"petal": 0.35}, "choco": {"foil": 0.2},
         "ringbox": {"gold": 0.2, "diamond": 0.0}}


def thumb(name):
    reset()
    REGISTRY[name.split("_")[0] if name.startswith("rose_") else name]()
    colors, target, dist, elev = THUMB[name]
    for m in bpy.data.materials:
        if m.name in colors and m.use_nodes:
            for nd in m.node_tree.nodes:
                if nd.type == "MIX":
                    nd.inputs[6].default_value = (*colors[m.name], 1.0)
        rough = METAL.get(name, {}).get(m.name)
        if rough is not None and m.use_nodes:
            b = m.node_tree.nodes.get("Principled BSDF")
            b.inputs["Metallic"].default_value = 1.0 if m.name != "diamond" else 0.0
            b.inputs["Roughness"].default_value = rough
            if m.name == "diamond":
                b.inputs["Transmission Weight"].default_value = 1.0
    setup_render((300, 300), samples=32)
    bpy.context.scene.render.film_transparent = True
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.view_settings.look = "Medium High Contrast"
    cam_data = bpy.data.cameras.new("cam")
    cam_data.lens = 50
    cam = bpy.data.objects.new("cam", cam_data)
    bpy.context.scene.collection.objects.link(cam)
    e = math.radians(elev)
    cam.location = (target[0], target[1] - dist * math.cos(e), target[2] + dist * math.sin(e))
    look_at(cam, target)
    bpy.context.scene.camera = cam
    bpy.context.scene.render.filepath = os.path.join(ROOT, "thumbs", f"{name}.png")
    bpy.ops.render.render(write_still=True)


if "--thumbs" in sys.argv:
    os.makedirs(os.path.join(ROOT, "thumbs"), exist_ok=True)
    only = [a for a in sys.argv[1:] if a in THUMB]
    for n in (only or THUMB):
        thumb(n)
