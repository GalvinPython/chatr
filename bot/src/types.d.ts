declare module "colorthief" {
  function getColor(url: string): Promise<[number, number, number]>;
}
