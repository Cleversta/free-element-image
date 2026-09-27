import type { Background } from "./scene.ts";
export const starterScenes: {
  slug: string;
  background: Background;
  heading: string;
  composition: string;
  exercise: string;
}[] = [
  {
    slug: "alpine-mirror-lake",
    background: {
      name: "Alpine Mirror Lake",
      description:
        "Snow-capped peaks, turquoise reflections, and a pine-framed meadow.",
      sky: "#eef0d7",
      ground: "#517957",
      src: "/assets/crafted-landscapes/alpine-mirror-lake.svg",
      kind: "full",
    },
    heading: "Frame the reflection",
    composition:
      "Keep the center of the lake open so the mountain reflection remains the main subject. Place one tree near an edge, then add a smaller tree farther back to suggest distance.",
    exercise:
      "Try a quiet composition with only two or three added objects. Compare it with a busier version before deciding which one to save.",
  },
  {
    slug: "sunlit-coastal-cove",
    background: {
      name: "Sunlit Coastal Cove",
      description:
        "Pale limestone cliffs, clear shallows, and a sweeping sandy beach.",
      sky: "#e7eee0",
      ground: "#6d875e",
      src: "/assets/crafted-landscapes/sunlit-coastal-cove.svg",
      kind: "full",
    },
    heading: "Leave room for the water",
    composition:
      "Use the coastline as a guide for your composition. Put buildings or plants on the land rather than across the open shallows, and keep the horizon visible.",
    exercise:
      "A single foreground object can provide scale without hiding the beach. Reduce its size until the coastline is still easy to follow.",
  },
  {
    slug: "emerald-rice-terraces",
    background: {
      name: "Emerald Rice Terraces",
      description:
        "Layered rice paddies wind around green hills and a small field shelter.",
      sky: "#eee5b5",
      ground: "#547b4d",
      src: "/assets/crafted-landscapes/emerald-rice-terraces.svg",
      kind: "full",
    },
    heading: "Follow the terrace curves",
    composition:
      "The rice terraces already lead the eye across the hills. Add small details along those curves, keeping distant objects smaller than objects near the bottom edge.",
    exercise:
      "Choose a few accents rather than filling every field. Empty space helps the layered landscape remain readable.",
  },
  {
    slug: "lavender-golden-hour",
    background: {
      name: "Lavender Golden Hour",
      description:
        "Violet flower rows and a stone farmhouse beneath a peach evening sky.",
      sky: "#f6d8b8",
      ground: "#6c7361",
      src: "/assets/crafted-landscapes/lavender-golden-hour.svg",
      kind: "full",
    },
    heading: "Balance the flower rows",
    composition:
      "The rows of lavender draw attention toward the farmhouse. Keep that route visible when adding trees or garden details, and place large objects to one side.",
    exercise:
      "Try repeating one small plant at different sizes. A gentle rhythm is easier to read than many unrelated objects.",
  },
  {
    slug: "silver-birch-clearing",
    background: {
      name: "Silver Birch Clearing",
      description:
        "White birch trunks and soft woodland light frame a quiet winding path.",
      sky: "#f3efd1",
      ground: "#879f72",
      src: "/assets/crafted-landscapes/silver-birch-clearing.svg",
      kind: "full",
    },
    heading: "Protect the woodland path",
    composition:
      "Let the winding path stay visible between the birch trunks. Place your largest additions in the foreground and use smaller details near the turn in the path.",
    exercise:
      "Experiment with one animal near the clearing. Move it a little off-center so the path still provides a natural route through the picture.",
  },
  {
    slug: "sandstone-arch-canyon",
    background: {
      name: "Sandstone Arch Canyon",
      description:
        "A sculpted sandstone arch, distant mesas, and warm desert trails.",
      sky: "#f6dec0",
      ground: "#d6a478",
      src: "/assets/crafted-landscapes/sandstone-arch-canyon.svg",
      kind: "full",
    },
    heading: "Use the arch as a focal point",
    composition:
      "Keep the opening of the sandstone arch clear. Low plants and rocks work well near the bottom corners, where they can frame the view without blocking the distant mesas.",
    exercise:
      "Compare a version with one accent to a version with several. The simpler arrangement often makes the large rock formation feel more dramatic.",
  },
  {
    slug: "northern-lights-river",
    background: {
      name: "Northern Lights River",
      description:
        "Flowing green aurora above snowy pines and a winding blue river.",
      sky: "#436879",
      ground: "#86adbd",
      src: "/assets/crafted-landscapes/northern-lights-river.svg",
      kind: "full",
    },
    heading: "Keep the sky open",
    composition:
      "The aurora is the main feature, so avoid covering it with large objects. Add details along the riverbanks and leave a clear line through the water.",
    exercise:
      "Use the flip control on repeated trees to make a pair feel less identical. Keep their sizes different to suggest depth.",
  },
  {
    slug: "cherry-blossom-bridge",
    background: {
      name: "Cherry Blossom Bridge",
      description:
        "Pink cherry canopies and an arched footbridge over a gentle spring river.",
      sky: "#f5e8cd",
      ground: "#8da577",
      src: "/assets/crafted-landscapes/cherry-blossom-bridge.svg",
      kind: "full",
    },
    heading: "Guide the eye to the bridge",
    composition:
      "The bridge gives this scene a natural focal point. Place small details beside the river, keeping the crossing and the water beneath it visible.",
    exercise:
      "Try one flower group in the foreground and another smaller group farther away. Lock the first group after placing it so it does not move accidentally.",
  },
  {
    slug: "tuscan-vineyard",
    background: {
      name: "Tuscan Vineyard",
      description:
        "Sunlit vineyard rows, cypress trees, and a terracotta-roof hill village.",
      sky: "#eee0b8",
      ground: "#8c995e",
      src: "/assets/crafted-landscapes/tuscan-vineyard.svg",
      kind: "full",
    },
    heading: "Respect the vineyard rows",
    composition:
      "The vineyard lines already create depth. Keep added buildings near the existing village and use a few taller trees at the edges to frame the hill.",
    exercise:
      "A large foreground plant and a smaller background plant can make the distance easier to read. Adjust the size before adding more objects.",
  },
  {
    slug: "hidden-jungle-falls",
    background: {
      name: "Hidden Jungle Falls",
      description:
        "A ribbon waterfall and jade pool enclosed by lush tropical forest.",
      sky: "#dce8c8",
      ground: "#417e66",
      src: "/assets/crafted-landscapes/hidden-jungle-falls.svg",
      kind: "full",
    },
    heading: "Frame the waterfall",
    composition:
      "Leave the falling water and its pool unobstructed. Add plants at the edges of the pool rather than directly over the waterfall.",
    exercise:
      "Try a slightly rotated leaf or tree to break up a rigid outline. Keep a clear patch of water so the scene has a place for the eye to rest.",
  },
  {
    slug: "copperwood-creek",
    background: {
      name: "Copperwood Creek",
      description:
        "Amber canopies, scattered leaves, and a small stone bridge beside a creek.",
      sky: "#eee0bb",
      ground: "#9e9f72",
      src: "/assets/crafted-landscapes/copperwood-creek.svg",
      kind: "full",
    },
    heading: "Follow the creek",
    composition:
      "Use the bridge and the creek as a route through the autumn scene. Place added objects beside that route, leaving enough space to see the water.",
    exercise:
      "Repeat a leaf shape sparingly and vary its size. A few foreground details can suggest the season without covering the existing canopy.",
  },
  {
    slug: "wildflower-trail",
    background: {
      name: "Wildflower Trail",
      description:
        "An open spring meadow with a winding trail and delicate floral borders.",
      sky: "#f1edd4",
      ground: "#789b68",
      src: "/assets/crafted-landscapes/wildflower-trail.svg",
      kind: "full",
    },
    heading: "Keep the trail readable",
    composition:
      "The winding trail gives this open meadow a gentle direction. Add flower groups on either side, leaving a gap where the path approaches the foreground.",
    exercise:
      "Start with three accents of different sizes. If the meadow begins to feel crowded, remove one and compare the result using Undo and Redo.",
  },
];

export function starterScene(slug: string) {
  return starterScenes.find((scene) => scene.slug === slug);
}
