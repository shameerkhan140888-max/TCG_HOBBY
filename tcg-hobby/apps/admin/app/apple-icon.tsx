import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

const logoDataUri = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/brand/tcg-hobby-icon.png')).toString('base64')}`;

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#050505',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <img
          alt="TCG Hobby"
          src={logoDataUri}
          style={{
            display: 'block',
            height: '100%',
            objectFit: 'contain',
            width: '100%',
          }}
        />
      </div>
    ),
    size,
  );
}
