import type { ParentProps } from 'solid-js';
import { HydrationScript } from '@solidjs/web';
import dataPath from 'virtual:data-document';

export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={`${import.meta.env.BASE_URL}favicon.ico`} />
        <title>Worldwound Planner</title>
        <link rel="preload" href={dataPath} as="fetch" type="application/json" crossorigin="anonymous" />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
