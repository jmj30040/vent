export type Product = {
  id: string;
  manufacturer: Manufacturer;
  name: string;
  fanType: string;
  maxCmh: number;
  maxCfm?: number;
  formula: string;
};

export const MANUFACTURERS = ['성일', '근옥', '코코', '휴미템'] as const;

export type Manufacturer = (typeof MANUFACTURERS)[number];

const FAN_SIZES_BY_MANUFACTURER: Record<Manufacturer, number[]> = {
  성일: [200, 250, 300, 350, 400, 500, 630, 960],
  근옥: [300, 350, 400, 500, 650, 800, 1000, 1200],
  코코: [200, 250, 300, 350, 400, 500, 600, 630, 800, 1000],
  휴미템: [300, 400, 500, 630],
};

const createFanProducts = (manufacturer: Manufacturer): Product[] =>
  FAN_SIZES_BY_MANUFACTURER[manufacturer].map((size) => {
    if (manufacturer === '근옥') {
      return createGeunokProduct(size);
    }

    const diameterMeters = size / 1000;
    const area = Math.PI * (diameterMeters / 2) ** 2;

    return {
      id: `${manufacturer}-${size}`,
      manufacturer,
      name: `${size}파이`,
      fanType: `${size}파이 환기휀`,
      maxCmh: Math.round(velocityMaxCmh(area)),
      formula: `velocity * 3600 * ${area.toFixed(4)}`,
    };
  });

const createGeunokProduct = (size: number): Product => {
  const diameterRatio = (size / 300) ** 2;
  const cmhAtVelocityOne = 252 * diameterRatio;

  return {
    id: `근옥-${size}`,
    manufacturer: '근옥',
    name: `${size}파이`,
    fanType: `${size}파이 환기휀`,
    maxCmh: Math.round(1899 * diameterRatio),
    maxCfm: Math.round(1097 * diameterRatio),
    formula: `velocity * ${cmhAtVelocityOne.toFixed(4)}`,
  };
};

export const PRODUCTS: Product[] = [
  ...createFanProducts('성일'),
  ...createFanProducts('근옥'),
  ...createFanProducts('코코'),
  ...createFanProducts('휴미템'),
];

function velocityMaxCmh(area: number) {
  return 10 * 3600 * area;
}
