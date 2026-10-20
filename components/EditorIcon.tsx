const paths = {
  new: "M12 5v14M5 12h14",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  folder: "M3 7V5h6l2 2h10v13H3Z",
  crop: "M6 3v15h15M3 6h15v15",
  image: "M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M16 7h.01",
  elements:
    "M3 3h7v7H3ZM17 3l4 7h-8ZM7 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8M14 17h7m-3-3v7",
  text: "M4 4h16M12 4v16M8 20h8",
  left: "M3 10h5M3 10V5M3 10a9 9 0 1 1 2 9",
  right: "M21 10h-5M21 10V5M21 10a9 9 0 1 0-2 9",
  flipX: "M12 3v18M8 5v14L2 12ZM16 5v14l6-7Z",
  flipY: "M3 12h18M5 8h14l-7-6ZM5 16h14l-7 6Z",
  done: "m5 12 4 4L19 6",
} as const;
export default function EditorIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
