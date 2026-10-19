// A phone screenshot in a frame. Both themes' screens are stacked and the
// theme cross-fades between them, so toggling never waits on a download.
// Each screen has a dark twin named with a -dark suffix.
export function PhoneShot({
  src = '/ice-delivery-route.webp',
  alt = 'The Corolla Ice Delivery driver app showing the route for the day',
}: {
  src?: string;
  alt?: string;
}) {
  return (
    <div className="phone-shot">
      <img
        className="phone-screen-light"
        src={src}
        alt={alt}
        width="640"
        height="1392"
        loading="lazy"
      />
      <img
        className="phone-screen-dark"
        src={src.replace('.webp', '-dark.webp')}
        alt=""
        width="640"
        height="1392"
        loading="lazy"
      />
    </div>
  );
}
