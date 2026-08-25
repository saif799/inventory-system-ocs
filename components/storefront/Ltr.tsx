/**
 * Wraps a value that must not be re-ordered by the RTL flow: anything coming
 * out of the database (model name, colour, size, commune, wilaya, price).
 *
 * `dir="ltr"` alone is not enough on an inline element inside an RTL line —
 * the surrounding bidi algorithm can still shuffle a trailing "DA" or a dash.
 * `unicode-bidi: isolate` fences the run off so it renders exactly as stored.
 */
export default function Ltr({
  children,
  className,
}: {
  // Optional because <Trans components={[<Ltr />]} /> supplies the children by
  // cloning the element — at the call site it is written without any.
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={className} style={{ unicodeBidi: "isolate" }}>
      {children}
    </span>
  );
}
