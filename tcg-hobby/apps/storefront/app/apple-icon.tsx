import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

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
        <div
          style={{
            background: 'linear-gradient(135deg, #ff8a00 0%, #ff4d2e 100%)',
            borderRadius: '36px',
            height: '136px',
            width: '136px',
          }}
        />
      </div>
    ),
    size,
  );
}
