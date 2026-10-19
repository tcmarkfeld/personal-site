import { useDarkTheme } from '@/lib/theme';

export function PhoneShot() {
  const dark = useDarkTheme();
  return (
    <div className="phone-shot">
      <img
        src={
          dark ? '/ice-delivery-route-dark.webp' : '/ice-delivery-route.webp'
        }
        alt="The Corolla Ice Delivery driver app showing the route for the day"
        width="640"
        height="1392"
        loading="lazy"
      />
    </div>
  );
}
