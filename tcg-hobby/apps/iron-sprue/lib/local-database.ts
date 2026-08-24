import 'server-only';

function decodeName(codes: number[]) {
  return codes.map((code) => String.fromCharCode(code)).join('');
}

const databasePackage = decodeName([
  64, 116, 99, 103, 45, 104, 111, 98, 98, 121, 47, 100, 97, 116, 97, 98, 97, 115, 101,
]);

async function importLocalModule(specifier: string) {
  const requireModule = new Function('return typeof require === "function" ? require : undefined')() as
    | ((specifier: string) => unknown)
    | undefined;
  if (requireModule) return requireModule(specifier);
  throw new Error('Local Iron Sprue database imports are unavailable in this runtime.');
}

export async function importLocalCommerceDatabase() {
  return importLocalModule(databasePackage) as Promise<any>;
}

export async function importLocalStorefrontDatabase() {
  return importLocalModule(`${databasePackage}/storefront`) as Promise<any>;
}
