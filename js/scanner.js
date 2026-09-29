/**
 * Boutique OS - Real-time Vision Barcode & QR Scanner
 */
class BarcodeScanner {
  static stream = null;
  static animFrameId = null;
  static isProcessing = false;
  static detector = null;

  static async start(onDetectedCallback) {
    const modal = document.getElementById('scanner-modal');
    const video = document.getElementById('scanner-video');
    modal.classList.add('active');
    BarcodeScanner.isProcessing = false;

    if ('BarcodeDetector' in window) {
      try {
        const formats = await BarcodeDetector.getSupportedFormats();
        BarcodeScanner.detector = new BarcodeDetector({ formats: formats || ['qr_code', 'ean_13', 'code_128', 'code_39'] });
      } catch (e) {
        BarcodeScanner.detector = null;
      }
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        BarcodeScanner.stream = stream;
        video.srcObject = stream;
        await video.play();

        BarcodeScanner.scanFrame(video, onDetectedCallback);
      } catch (err) {
        alert('خطا در دسترسی به دوربین: ' + err.message);
        BarcodeScanner.stop();
      }
    } else {
      alert('مرورگر شما دسترسی به دوربین را مجاز نمی‌داند.');
      BarcodeScanner.stop();
    }

    // Direct manual barcode / simulated input handler
    const manualBtn = document.getElementById('manual-barcode-btn');
    if (manualBtn) {
      manualBtn.onclick = () => {
        const code = prompt('کد بارکد یا SKU کالا را وارد کنید:');
        if (code && code.trim()) {
          BarcodeScanner.handleDetectedCode(code.trim(), onDetectedCallback);
        }
      };
    }
  }

  static async scanFrame(video, callback) {
    if (!BarcodeScanner.stream) return;

    if (!BarcodeScanner.isProcessing && video.readyState === video.HAVE_ENOUGH_DATA) {
      if (BarcodeScanner.detector) {
        try {
          const barcodes = await BarcodeScanner.detector.detect(video);
          if (barcodes.length > 0) {
            BarcodeScanner.isProcessing = true;
            const codeValue = barcodes[0].rawValue.trim();
            BarcodeScanner.handleDetectedCode(codeValue, callback);
            return;
          }
        } catch (e) {}
      }
    }

    BarcodeScanner.animFrameId = requestAnimationFrame(() => BarcodeScanner.scanFrame(video, callback));
  }

  static handleDetectedCode(codeValue, callback) {
    BarcodeScanner.playBeep();

    const products = Database.get('products');
    const product = products.find(p => p.sku.toUpperCase() === codeValue.toUpperCase() || p.id === codeValue);

    if (!product) {
      alert(`❌ اخطار: بارکد "${codeValue}" در سیستم ثبت نشده است!`);
      setTimeout(() => {
        BarcodeScanner.isProcessing = false;
        const video = document.getElementById('scanner-video');
        if (video) BarcodeScanner.scanFrame(video, callback);
      }, 1200);
      return;
    }

    BarcodeScanner.stop();
    BarcodeScanner.showConfirmProductModal(product, callback);
  }

  static showConfirmProductModal(product, onConfirm) {
    let confirmBox = document.getElementById('scan-confirm-modal');
    if (!confirmBox) {
      confirmBox = document.createElement('div');
      confirmBox.className = 'modal-overlay';
      confirmBox.id = 'scan-confirm-modal';
      document.body.appendChild(confirmBox);
    }

    confirmBox.innerHTML = `
      <div class="modal-box" style="max-width:380px; text-align:center;">
        <div style="font-size:2.2rem; margin-bottom:8px;">👗</div>
        <h3 style="color:#fff; margin-bottom:4px;">${product.name}</h3>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:12px;">کد شناسایی: ${product.sku}</p>
        
        <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:16px; text-align:right; font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
          <div><strong>سایز / رنگ:</strong> ${product.size} - ${product.color}</div>
          <div><strong>قیمت فروش:</strong> <span style="color:var(--cyan); font-weight:800;">${product.priceSell.toLocaleString()} تومان</span></div>
          <div><strong>موجودی انبار:</strong> <span style="color:${product.stock > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">${product.stock} عدد</span></div>
        </div>

        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary btn-full" id="btn-confirm-add-cart">✅ تایید و افزودن به سبد</button>
          <button class="btn btn-secondary" id="btn-cancel-add-cart">انصراف</button>
        </div>
      </div>
    `;

    confirmBox.classList.add('active');

    document.getElementById('btn-confirm-add-cart').onclick = () => {
      confirmBox.classList.remove('active');
      onConfirm(product);
    };

    document.getElementById('btn-cancel-add-cart').onclick = () => {
      confirmBox.classList.remove('active');
    };
  }

  static playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 120);
    } catch (e) {}
  }

  static stop() {
    if (BarcodeScanner.animFrameId) {
      cancelAnimationFrame(BarcodeScanner.animFrameId);
      BarcodeScanner.animFrameId = null;
    }
    if (BarcodeScanner.stream) {
      BarcodeScanner.stream.getTracks().forEach(t => t.stop());
      BarcodeScanner.stream = null;
    }
    BarcodeScanner.isProcessing = false;
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('active');
  }
}
