import { useMemo, useState } from 'react';
import { calculateVentilation, CalculationResult } from './calculator';
import { Manufacturer, MANUFACTURERS, PRODUCTS } from './products';
import farmscoLogo from './assets/images/logo.png';
import measurementMethodImage from './assets/measurement-method.svg';

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

type ManufacturerSelection = Manufacturer | '';

function App() {
  const [manufacturer, setManufacturer] = useState<ManufacturerSelection>('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [velocity, setVelocity] = useState('0');
  const [isMethodOpen, setIsMethodOpen] = useState(false);

  const manufacturerProducts = useMemo(
    () =>
      manufacturer
        ? PRODUCTS.filter((product) => product.manufacturer === manufacturer)
        : [],
    [manufacturer],
  );

  const selectedProduct = useMemo(
    () =>
      manufacturerProducts.find((product) => product.id === selectedProductId) ??
      null,
    [manufacturerProducts, selectedProductId],
  );

  const handleManufacturerChange = (nextManufacturer: ManufacturerSelection) => {
    setManufacturer(nextManufacturer);
    setSelectedProductId('');
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
  };

  const calculation = useMemo<{
    result: CalculationResult | null;
    error: string;
  }>(() => {
    if (!manufacturer || !selectedProduct) {
      return {
        result: null,
        error: '',
      };
    }

    const numericVelocity = Number(velocity);
    if (velocity.trim() === '' || !Number.isFinite(numericVelocity) || numericVelocity < 0) {
      return {
        result: null,
        error: '풍속은 0 이상 숫자만 입력할 수 있습니다.',
      };
    }

    try {
      return {
        result: calculateVentilation(
          selectedProduct.formula,
          numericVelocity,
          selectedProduct.maxCmh,
          selectedProduct.maxCfm,
        ),
        error: '',
      };
    } catch (caughtError) {
      return {
        result: null,
        error:
          caughtError instanceof Error
            ? caughtError.message
            : '계산식을 확인해 주세요.',
      };
    }
  }, [manufacturer, selectedProduct, velocity]);

  const { result, error } = calculation;

  return (
    <main className="app-shell">
      <section className="page-header">
        <img className="brand-logo" src={farmscoLogo} alt="Farmsco" />
        <div>
          <p className="breadcrumb">환기 관리 / 계산 도구</p>
          <h1>팜스코 환기량 측정</h1>
        </div>
      </section>

      <section className="content-grid">
        <section className="form-panel">
          <div className="panel-header">
            <h2>기본 정보</h2>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setIsMethodOpen(true)}
            >
              측정 방법
            </button>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>제조사</span>
              <select
                value={manufacturer}
                onChange={(event) =>
                  handleManufacturerChange(event.target.value as ManufacturerSelection)
                }
              >
                <option value="">제조사를 선택해주세요</option>
                {MANUFACTURERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>환기휀 종류</span>
              <select
                value={selectedProductId}
                onChange={(event) => handleProductChange(event.target.value)}
                disabled={!manufacturer}
              >
                <option value="">환기휀 종류를 선택해주세요</option>
                {manufacturerProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>풍속(m/s)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={velocity}
                onChange={(event) => setVelocity(event.target.value)}
                placeholder="예: 1.5"
              />
            </label>

          </div>

          {error && <p className="error-message">{error}</p>}

        </section>

        <aside className="summary-panel">
          <div className="panel-header">
            <h2>계산 결과</h2>
          </div>

          <div className="result-grid">
            <div className="result-column">
              <ResultCard label="최대 CMH 환기량" value={result?.maxCmh} unit="CMH" />
              <ResultCard label="CMH 환기량" value={result?.cmh} unit="CMH" emphasized />
              <ResultCard label="CMH 환기율" value={result?.cmhRate} unit="%" />
            </div>
            <div className="result-column">
              <ResultCard label="최대 CFM 환기량" value={result?.maxCfm} unit="CFM" />
              <ResultCard label="CFM 환기량" value={result?.cfm} unit="CFM" emphasized />
              <ResultCard label="CFM 환기율" value={result?.cfmRate} unit="%" />
            </div>
          </div>
        </aside>
      </section>

      {isMethodOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setIsMethodOpen(false)}
        >
          <section
            className="method-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="method-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="method-modal-title">측정 방법</h2>
              <button
                className="icon-button"
                type="button"
                aria-label="닫기"
                onClick={() => setIsMethodOpen(false)}
              >
                x
              </button>
            </div>
            <div className="modal-body">
              <img src={measurementMethodImage} alt="환기량 측정방법 안내" />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

type ResultCardProps = {
  label: string;
  value?: number;
  unit: string;
  emphasized?: boolean;
};

function ResultCard({ label, value, unit, emphasized = false }: ResultCardProps) {
  return (
    <div className={emphasized ? 'result-card emphasized' : 'result-card'}>
      <span>{label}</span>
      <strong>{value === undefined ? '-' : numberFormatter.format(value)}</strong>
      <small>{unit}</small>
    </div>
  );
}

export default App;
