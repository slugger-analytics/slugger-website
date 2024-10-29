"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LogoButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/");
  };

  return (
    // TODO: image is slightly stretched.
    <button className="h-10 w-12 relative" onClick={handleClick}>
      <Image
        src="/alpb-logo.png"
        alt="ALPB logo"
        fill={true}
        sizes="(max-width: 768px) 100vw"
      />
    </button>
  );
}
