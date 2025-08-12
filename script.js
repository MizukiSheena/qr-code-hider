class QRCodeHider {
    constructor() {
        this.qrImage = null;
        this.bgImage = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 文件上传事件
        document.getElementById('qrInput').addEventListener('change', (e) => this.handleQRUpload(e));
        document.getElementById('bgInput').addEventListener('change', (e) => this.handleBGUpload(e));
        
        // 拖拽上传事件
        this.setupDragAndDrop('qrUploadArea', 'qrInput');
        this.setupDragAndDrop('bgUploadArea', 'bgInput');
        
        // 点击上传区域事件
        document.getElementById('qrUploadArea').addEventListener('click', () => {
            document.getElementById('qrInput').click();
        });
        document.getElementById('bgUploadArea').addEventListener('click', () => {
            document.getElementById('bgInput').click();
        });
        
        // 控制面板事件
        document.getElementById('opacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
        });
        
        document.getElementById('size').addEventListener('input', (e) => {
            document.getElementById('sizeValue').textContent = e.target.value + 'px';
        });
        
        // 按钮事件
        document.getElementById('processBtn').addEventListener('click', () => this.processImages());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadResult());
        document.getElementById('newProcessBtn').addEventListener('click', () => this.newProcess());
    }

    setupDragAndDrop(areaId, inputId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                input.files = files;
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    }

    handleQRUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件！');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.qrImage = new Image();
            this.qrImage.onload = () => {
                this.displayPreview('qrPreview', this.qrImage);
                this.checkBothImagesLoaded();
            };
            this.qrImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleBGUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件！');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.bgImage = new Image();
            this.bgImage.onload = () => {
                this.displayPreview('bgPreview', this.bgImage);
                this.checkBothImagesLoaded();
            };
            this.bgImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    displayPreview(previewId, image) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = image.src;
        img.alt = 'Preview';
        preview.appendChild(img);
    }

    checkBothImagesLoaded() {
        if (this.qrImage && this.bgImage) {
            document.getElementById('controlsSection').style.display = 'block';
        }
    }

    processImages() {
        if (!this.qrImage || !this.bgImage) {
            alert('请先上传二维码和背景图片！');
            return;
        }

        const processBtn = document.getElementById('processBtn');
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="loading"></span> 处理中...';
        processBtn.disabled = true;

        // 使用 setTimeout 让 UI 有时间更新
        setTimeout(() => {
            try {
                this.blendImages();
                document.getElementById('resultSection').style.display = 'block';
                document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error('处理图片时出错:', error);
                alert('处理图片时出错，请重试！');
            } finally {
                processBtn.innerHTML = originalText;
                processBtn.disabled = false;
            }
        }, 100);
    }

    blendImages() {
        const canvas = document.getElementById('resultCanvas');
        const ctx = canvas.getContext('2d');
        
        // 设置画布大小为背景图大小
        canvas.width = this.bgImage.width;
        canvas.height = this.bgImage.height;
        
        // 绘制背景图
        ctx.drawImage(this.bgImage, 0, 0);
        
        // 获取控制参数
        const opacity = parseFloat(document.getElementById('opacity').value);
        const blendMode = document.getElementById('blendMode').value;
        const position = document.getElementById('position').value;
        const size = parseInt(document.getElementById('size').value);
        
        // 计算二维码位置
        const qrPos = this.calculateQRPosition(position, size);
        
        // 创建临时画布处理二维码
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = size;
        tempCanvas.height = size;
        
        // 绘制调整大小后的二维码
        tempCtx.drawImage(this.qrImage, 0, 0, size, size);
        
        // 应用透明度和混合模式
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode;
        
        // 绘制二维码到主画布
        ctx.drawImage(tempCanvas, qrPos.x, qrPos.y);
        
        // 重置画布设置
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    calculateQRPosition(position, size) {
        const canvasWidth = this.bgImage.width;
        const canvasHeight = this.bgImage.height;
        
        // 计算中心点
        const centerX = (canvasWidth - size) / 2;
        const centerY = (canvasHeight - size) / 2;
        
        // 偏移量：从中心向各方向偏移的距离（相对于画布尺寸的比例）
        const offsetRatioX = 0.25; // 水平偏移比例
        const offsetRatioY = 0.25; // 垂直偏移比例
        
        const offsetX = canvasWidth * offsetRatioX * 0.5; // 水平偏移距离
        const offsetY = canvasHeight * offsetRatioY * 0.5; // 垂直偏移距离
        
        let x, y;
        
        switch (position) {
            case 'top-left':
                x = centerX - offsetX;
                y = centerY - offsetY;
                break;
            case 'top-right':
                x = centerX + offsetX;
                y = centerY - offsetY;
                break;
            case 'bottom-left':
                x = centerX - offsetX;
                y = centerY + offsetY;
                break;
            case 'bottom-right':
                x = centerX + offsetX;
                y = centerY + offsetY;
                break;
            case 'center':
            default:
                x = centerX;
                y = centerY;
                break;
        }
        
        // 确保二维码不会超出画布边界
        x = Math.max(10, Math.min(x, canvasWidth - size - 10));
        y = Math.max(10, Math.min(y, canvasHeight - size - 10));
        
        return { x, y };
    }

    downloadResult() {
        const canvas = document.getElementById('resultCanvas');
        const link = document.createElement('a');
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `hidden-qr-${timestamp}.png`;
        
        // 创建下载链接
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png', 0.95);
    }

    reset() {
        // 重置图片
        this.qrImage = null;
        this.bgImage = null;
        
        // 清空输入
        document.getElementById('qrInput').value = '';
        document.getElementById('bgInput').value = '';
        
        // 清空预览
        document.getElementById('qrPreview').innerHTML = '';
        document.getElementById('bgPreview').innerHTML = '';
        
        // 隐藏控制面板和结果区域
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';
        
        // 重置控制参数
        document.getElementById('opacity').value = 0.3;
        document.getElementById('opacityValue').textContent = '0.3';
        document.getElementById('size').value = 150;
        document.getElementById('sizeValue').textContent = '150px';
        document.getElementById('blendMode').value = 'multiply';
        document.getElementById('position').value = 'center';
    }

    newProcess() {
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('controlsSection').style.display = 'block';
    }
}

// 页面加载完成后初始化
function initializeApp() {
    // 确保DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new QRCodeHider();
        });
    } else {
        // DOM已经加载完成
        new QRCodeHider();
    }
}

// 立即调用初始化函数
initializeApp();

// 添加一些实用函数
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ff4757' : '#2ed573'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 添加 CSS 动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
