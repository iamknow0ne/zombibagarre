import path from 'node:path';

// Build and smoke must resolve the same directory; a versioned destination
// leaves older installed/running application bundles untouched.
export function desktopOutputDir(args,root){
 const options=args.filter(arg=>arg.startsWith('--output-dir='));
 if(args.includes('--output-dir'))throw new Error('Use --output-dir=<path> to choose the desktop output directory.');
 if(options.length>1)throw new Error('Specify --output-dir only once.');
 if(!options.length)return path.resolve(root,'release');
 const value=options[0].slice('--output-dir='.length);
 if(!value.trim()||value.includes('\0'))throw new Error('Desktop output directory must be a non-empty filesystem path.');
 return path.resolve(root,value);
}
