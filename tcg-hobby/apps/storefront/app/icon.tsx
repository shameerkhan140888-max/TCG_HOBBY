import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(180deg, #111111 0%, #050505 100%)',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'linear-gradient(135deg, #ff8a00 0%, #ff4d2e 100%)',
            borderRadius: '128px',
            boxShadow: '0 0 0 14px rgba(255,255,255,0.06)',
            display: 'flex',
            height: '280px',
            justifyContent: 'center',
            position: 'relative',
            width: '280px',
          }}
        >
          <div
            style={{
              background: '#0b0b0b',
              borderRadius: '999px',
              height: '96px',
              width: '96px',
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
