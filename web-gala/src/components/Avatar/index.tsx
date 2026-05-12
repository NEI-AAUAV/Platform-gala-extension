import config from "@/config";
import useNEIUser from "@/hooks/useNEIUser";
import { useUserStore } from "@/stores/useUserStore";

type AvatarProps = {
  className?: string;
  style?: React.CSSProperties;
  id?: number | null;
  alt?: string;
};
const defaultImage = `${config.BASE_URL}/gala/default-profile.svg`;

export default function Avatar({ className, style, id, alt }: AvatarProps) {
  const { neiUser } = useNEIUser(id != null && id !== -1 ? id : null);
  const userStoreImage = useUserStore((state) => state.image);

  let imageSrc: string | undefined;
  if (id == null) {
    imageSrc = userStoreImage;
  } else if (id === -1 || neiUser?.image == null) {
    imageSrc = defaultImage;
  } else {
    imageSrc = neiUser.image;
  }

  if (!imageSrc) {
    return null;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`inline-block aspect-square w-8 rounded-full object-cover object-center ${className}`}
      style={style}
    />
  );
}

Avatar.defaultProps = {
  className: "",
  style: {},
  id: null,
  alt: "",
};
