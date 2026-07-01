import unreal

MAP_PACKAGE = "/Game/Maps/L_CliffwaldPrototype"
GAME_MODE = "/Script/Cliffwald.CliffwaldGameMode"
PROTOTYPE_WORLD = "/Script/Cliffwald.CliffwaldPrototypeWorld"
MANAGED_PREFIX = "CW_"

BLOCKS = [
    ("MeadowGround", "cube", (0.0, 0.0, -8.0), (42.0, 42.0, 0.12)),
    ("MainHall", "cube", (650.0, 0.0, 145.0), (5.4, 2.8, 2.9)),
    ("LibraryWing", "cube", (250.0, -410.0, 105.0), (3.5, 2.0, 2.1)),
    ("DormWing", "cube", (250.0, 410.0, 105.0), (3.5, 2.0, 2.1)),
    ("DiningHall", "cube", (950.0, 0.0, 80.0), (2.8, 4.4, 1.6)),
    ("MainHallRoof", "cube", (650.0, 0.0, 303.0), (5.8, 3.0, 0.28)),
    ("LibraryRoof", "cube", (250.0, -410.0, 221.0), (3.8, 2.2, 0.25)),
    ("DormRoof", "cube", (250.0, 410.0, 221.0), (3.8, 2.2, 0.25)),
    ("DiningRoof", "cube", (950.0, 0.0, 169.0), (3.0, 4.7, 0.22)),
    ("NorthTower", "cylinder", (620.0, -330.0, 230.0), (1.15, 1.15, 4.6)),
    ("SouthTower", "cylinder", (620.0, 330.0, 230.0), (1.15, 1.15, 4.6)),
    ("GateTowerLeft", "cylinder", (-350.0, -180.0, 125.0), (0.75, 0.75, 2.5)),
    ("GateTowerRight", "cylinder", (-350.0, 180.0, 125.0), (0.75, 0.75, 2.5)),
    ("CourtyardPath", "cube", (130.0, 0.0, -1.0), (10.0, 0.55, 0.06)),
    ("LibraryPath", "cube", (210.0, -215.0, 0.0), (4.0, 0.38, 0.05)),
    ("DormPath", "cube", (210.0, 215.0, 0.0), (4.0, 0.38, 0.05)),
    ("CourtyardWell", "cylinder", (40.0, 0.0, 24.0), (0.62, 0.62, 0.48)),
    ("PracticeRune", "cylinder", (-160.0, 0.0, 5.0), (1.1, 1.1, 0.035)),
]

TREE_LOCATIONS = [
    (-220.0, -360.0, 0.0),
    (-80.0, -500.0, 0.0),
    (90.0, -590.0, 0.0),
    (450.0, -610.0, 0.0),
    (790.0, -520.0, 0.0),
    (-220.0, 360.0, 0.0),
    (-80.0, 500.0, 0.0),
    (90.0, 590.0, 0.0),
    (450.0, 610.0, 0.0),
    (790.0, 520.0, 0.0),
]


def vec(values):
    return unreal.Vector(values[0], values[1], values[2])


def spawn_block(actor_editor, name, mesh, location, scale):
    actor = actor_editor.spawn_actor_from_class(
        unreal.StaticMeshActor,
        vec(location),
        unreal.Rotator(0.0, 0.0, 0.0),
    )
    actor.set_actor_label(f"{MANAGED_PREFIX}{name}")
    actor.set_actor_scale3d(vec(scale))

    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    component.set_static_mesh(mesh)
    component.set_mobility(unreal.ComponentMobility.STATIC)
    component.set_collision_profile_name("BlockAll")
    return actor


def spawn_lighting(actor_editor):
    sun = actor_editor.spawn_actor_from_class(
        unreal.DirectionalLight,
        unreal.Vector(-450.0, -700.0, 900.0),
        unreal.Rotator(-42.0, -35.0, 0.0),
    )
    sun.set_actor_label(f"{MANAGED_PREFIX}Sun")
    sun_component = sun.get_component_by_class(unreal.DirectionalLightComponent)
    sun_component.set_editor_property("intensity", 8.0)

    sky = actor_editor.spawn_actor_from_class(
        unreal.SkyLight,
        unreal.Vector(0.0, 0.0, 0.0),
        unreal.Rotator(0.0, 0.0, 0.0),
    )
    sky.set_actor_label(f"{MANAGED_PREFIX}Sky")
    sky_component = sky.get_component_by_class(unreal.SkyLightComponent)
    sky_component.set_editor_property("intensity", 2.5)


def main():
    level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    actor_editor = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

    if unreal.EditorAssetLibrary.does_asset_exist(MAP_PACKAGE):
        level_editor.load_level(MAP_PACKAGE)
    else:
        level_editor.new_level(MAP_PACKAGE)

    world = editor.get_editor_world()
    if world is None:
        raise RuntimeError("No editor world available after creating prototype map")

    game_mode_class = unreal.load_class(None, GAME_MODE)
    if game_mode_class is None:
        raise RuntimeError(f"Could not load game mode class {GAME_MODE}")

    prototype_world_class = unreal.load_class(None, PROTOTYPE_WORLD)
    if prototype_world_class is None:
        raise RuntimeError(f"Could not load prototype world class {PROTOTYPE_WORLD}")

    world_settings = world.get_world_settings()
    world_settings.set_editor_property("default_game_mode", game_mode_class)

    for actor in actor_editor.get_all_level_actors():
        if (
            isinstance(actor, unreal.PlayerStart)
            or actor.get_class().get_path_name() == PROTOTYPE_WORLD
            or actor.get_actor_label().startswith(MANAGED_PREFIX)
        ):
            actor_editor.destroy_actor(actor)

    actor_editor.spawn_actor_from_class(
        unreal.PlayerStart,
        unreal.Vector(0.0, 0.0, 120.0),
        unreal.Rotator(0.0, 0.0, 0.0),
    )
    prototype_world = actor_editor.spawn_actor_from_class(
        prototype_world_class,
        unreal.Vector(0.0, 0.0, 0.0),
        unreal.Rotator(0.0, 0.0, 0.0),
    )
    prototype_world.set_actor_label("CliffwaldPrototypeWorld")

    meshes = {
        "cube": unreal.load_asset("/Engine/BasicShapes/Cube.Cube"),
        "cylinder": unreal.load_asset("/Engine/BasicShapes/Cylinder.Cylinder"),
        "sphere": unreal.load_asset("/Engine/BasicShapes/Sphere.Sphere"),
    }
    if any(mesh is None for mesh in meshes.values()):
        raise RuntimeError("Could not load one or more basic shape meshes")

    for name, mesh_key, location, scale in BLOCKS:
        spawn_block(actor_editor, name, meshes[mesh_key], location, scale)

    for index, location in enumerate(TREE_LOCATIONS):
        x, y, z = location
        spawn_block(actor_editor, f"TreeTrunk_{index:02d}", meshes["cylinder"], (x, y, z + 58.0), (0.18, 0.18, 1.15))
        spawn_block(actor_editor, f"TreeCanopy_{index:02d}", meshes["sphere"], (x, y, z + 145.0), (0.86, 0.86, 0.72))

    spawn_lighting(actor_editor)

    saved = unreal.EditorLoadingAndSavingUtils.save_map(world, MAP_PACKAGE)
    if not saved:
        raise RuntimeError(f"Failed to save {MAP_PACKAGE}")

    unreal.log(f"Created {MAP_PACKAGE} with {GAME_MODE}")


if __name__ == "__main__":
    main()
