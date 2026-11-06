/** Small inline loading spinner; inherits the surrounding text colour. */
export default function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} aria-hidden={!label} />;
}
