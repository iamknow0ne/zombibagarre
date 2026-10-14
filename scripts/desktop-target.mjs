export function desktopTarget(args, host = {platform:process.platform, arch:process.arch}) {
  const mac = args.includes('--mac');
  const requested = args.find(arg => arg.startsWith('--arch='))?.slice(7);
  const platform = mac ? 'darwin' : 'linux';
  const arch = requested || (mac ? host.arch : 'x64');
  if (mac && host.platform !== 'darwin') throw new Error('Build the macOS edition on a Mac so its icon and code signatures can be verified.');
  if (!(mac ? ['arm64','x64'] : ['x64']).includes(arch)) throw new Error(`Unsupported ${platform} architecture: ${arch}`);
  return {platform, arch, name:mac ? 'Zombie Bagarre' : 'zombie-bagarre', executableName:'zombie-bagarre'};
}
