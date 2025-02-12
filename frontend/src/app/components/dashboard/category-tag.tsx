type PropsType = {
  categoryName: string;
  hexCode?: string;
  className?: string;
  style?: React.CSSProperties;
  textColor?: string;
  onClick?: () => void;
};

export default function CategoryTag({
  categoryName,
  hexCode,
  className = "",
  style = {},
  textColor = "text-slate-700",
  onClick = () => {}
}: PropsType) {
  return (
    <div
      className={`inline-block py-1 px-2 rounded-md ${textColor} ${className}`}
      style={{
        backgroundColor: hexCode || "#F1F1EF",
        ...style,
      }}
      onClick={onClick}
    >
      {categoryName}
    </div>
  );
}
