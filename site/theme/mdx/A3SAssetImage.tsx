import { type ImgHTMLAttributes } from 'react';
import { withBase } from '@rspress/core/runtime';

export default function A3SAssetImage({
  path,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { path: string }) {
  return <img {...props} src={withBase(path)} />;
}
