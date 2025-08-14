// 高级二维码隐藏工具 - 像素级和智能融合算法
class AdvancedQRCodeHider {
    constructor() {
        this.qrImage = null;
        this.bgImage = null;
        this.analysisResult = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // 继承原有事件监听器
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
        
        // 高级控制面板事件
        document.getElementById('opacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
            this.updateRealTimePreview();
        });
        
        document.getElementById('size').addEventListener('input', (e) => {
            document.getElementById('sizeValue').textContent = e.target.value + 'px';
            this.updateRealTimePreview();
        });

        // 新增的高级控制
        document.getElementById('edgeStrength')?.addEventListener('input', (e) => {
            document.getElementById('edgeStrengthValue').textContent = e.target.value;
            this.updateRealTimePreview();
        });

        document.getElementById('textureAdaption')?.addEventListener('input', (e) => {
            document.getElementById('textureAdaptionValue').textContent = e.target.value;
            this.updateRealTimePreview();
        });
        
        // 按钮事件
        document.getElementById('processBtn').addEventListener('click', () => this.processImagesAdvanced());
        document.getElementById('analyzeBtn')?.addEventListener('click', () => this.analyzeBackground());
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
            this.showToast('请上传图片文件！', 'error');
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
            this.showToast('请上传图片文件！', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            this.bgImage = new Image();
            this.bgImage.onload = () => {
                this.displayPreview('bgPreview', this.bgImage);
                this.checkBothImagesLoaded();
                // 自动分析背景图
                setTimeout(() => this.analyzeBackground(), 500);
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
            // 显示分析按钮
            const analyzeBtn = document.getElementById('analyzeBtn');
            if (analyzeBtn) {
                analyzeBtn.style.display = 'inline-block';
            }
        }
    }

    // ==================== 阶段1：像素级分析和处理 ====================

    /**
     * 分析背景图像的纹理和特征
     */
    analyzeBackground() {
        if (!this.bgImage) {
            this.showToast('请先上传背景图片！', 'error');
            return;
        }

        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.innerHTML = '<span class="loading"></span> 分析中...';
            analyzeBtn.disabled = true;
        }

        // 使用Web Worker进行复杂计算，避免阻塞UI
        setTimeout(() => {
            try {
                this.analysisResult = this.performImageAnalysis(this.bgImage);
                this.displayAnalysisResults(this.analysisResult);
                this.showToast('背景分析完成！', 'success');
            } catch (error) {
                console.error('分析失败:', error);
                this.showToast('分析失败，请重试！', 'error');
            } finally {
                if (analyzeBtn) {
                    analyzeBtn.innerHTML = '🔍 重新分析';
                    analyzeBtn.disabled = false;
                }
            }
        }, 1000);
    }

    /**
     * 执行图像分析
     */
    performImageAnalysis(image) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = image.width;
        canvas.height = image.height;
        
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 分析不同区域的特征
        const regions = this.divideIntoRegions(imageData, 3, 3); // 3x3网格
        const analysis = {
            regions: [],
            bestPosition: null,
            recommendedSettings: null
        };

        regions.forEach((region, index) => {
            const regionAnalysis = {
                index: index,
                position: this.getRegionPosition(index, 3, 3),
                contrast: this.calculateContrast(region),
                variance: this.calculateVariance(region),
                edgeStrength: this.calculateEdgeStrength(region),
                colorComplexity: this.calculateColorComplexity(region),
                textureScore: 0
            };
            
            // 计算综合纹理得分
            regionAnalysis.textureScore = (
                regionAnalysis.contrast * 0.3 +
                regionAnalysis.variance * 0.3 +
                regionAnalysis.edgeStrength * 0.2 +
                regionAnalysis.colorComplexity * 0.2
            );
            
            analysis.regions.push(regionAnalysis);
        });

        // 找到最适合隐藏二维码的区域
        analysis.bestPosition = this.findBestHidingPosition(analysis.regions);
        analysis.recommendedSettings = this.generateRecommendedSettings(analysis.bestPosition);

        return analysis;
    }

    /**
     * 将图像分割为网格区域
     */
    divideIntoRegions(imageData, rows, cols) {
        const regions = [];
        const regionWidth = Math.floor(imageData.width / cols);
        const regionHeight = Math.floor(imageData.height / rows);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * regionWidth;
                const y = row * regionHeight;
                const region = this.extractRegion(imageData, x, y, regionWidth, regionHeight);
                regions.push(region);
            }
        }

        return regions;
    }

    /**
     * 提取指定区域的像素数据
     */
    extractRegion(imageData, x, y, width, height) {
        const region = {
            pixels: [],
            width: width,
            height: height
        };

        for (let py = y; py < y + height && py < imageData.height; py++) {
            for (let px = x; px < x + width && px < imageData.width; px++) {
                const index = (py * imageData.width + px) * 4;
                region.pixels.push({
                    r: imageData.data[index],
                    g: imageData.data[index + 1],
                    b: imageData.data[index + 2],
                    a: imageData.data[index + 3]
                });
            }
        }

        return region;
    }

    /**
     * 计算区域对比度
     */
    calculateContrast(region) {
        if (region.pixels.length === 0) return 0;

        let minLuminance = 255;
        let maxLuminance = 0;

        region.pixels.forEach(pixel => {
            const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
            minLuminance = Math.min(minLuminance, luminance);
            maxLuminance = Math.max(maxLuminance, luminance);
        });

        return (maxLuminance - minLuminance) / 255;
    }

    /**
     * 计算区域方差（纹理复杂度指标）
     */
    calculateVariance(region) {
        if (region.pixels.length === 0) return 0;

        // 计算平均亮度
        let totalLuminance = 0;
        region.pixels.forEach(pixel => {
            const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
            totalLuminance += luminance;
        });
        const avgLuminance = totalLuminance / region.pixels.length;

        // 计算方差
        let variance = 0;
        region.pixels.forEach(pixel => {
            const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
            variance += Math.pow(luminance - avgLuminance, 2);
        });

        return Math.sqrt(variance / region.pixels.length) / 255;
    }

    /**
     * 计算边缘强度
     */
    calculateEdgeStrength(region) {
        if (region.pixels.length < 4) return 0;

        let edgeStrength = 0;
        const width = region.width;
        const height = region.height;

        // 简化的Sobel算子
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (idx >= region.pixels.length - width - 1) continue;

                const pixel = region.pixels[idx];
                const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;

                // 计算水平和垂直梯度
                const leftPixel = region.pixels[idx - 1];
                const rightPixel = region.pixels[idx + 1];
                const topPixel = region.pixels[idx - width];
                const bottomPixel = region.pixels[idx + width];

                const leftLum = 0.299 * leftPixel.r + 0.587 * leftPixel.g + 0.114 * leftPixel.b;
                const rightLum = 0.299 * rightPixel.r + 0.587 * rightPixel.g + 0.114 * rightPixel.b;
                const topLum = 0.299 * topPixel.r + 0.587 * topPixel.g + 0.114 * topPixel.b;
                const bottomLum = 0.299 * bottomPixel.r + 0.587 * bottomPixel.g + 0.114 * bottomPixel.b;

                const gx = rightLum - leftLum;
                const gy = bottomLum - topLum;
                const magnitude = Math.sqrt(gx * gx + gy * gy);

                edgeStrength += magnitude;
            }
        }

        return edgeStrength / (region.pixels.length * 255);
    }

    /**
     * 计算颜色复杂度
     */
    calculateColorComplexity(region) {
        if (region.pixels.length === 0) return 0;

        const colorMap = new Map();
        
        region.pixels.forEach(pixel => {
            // 量化颜色以减少计算复杂度
            const quantizedR = Math.floor(pixel.r / 32) * 32;
            const quantizedG = Math.floor(pixel.g / 32) * 32;
            const quantizedB = Math.floor(pixel.b / 32) * 32;
            const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
            
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        });

        // 颜色种类越多，复杂度越高
        return Math.min(colorMap.size / 64, 1); // 归一化到0-1
    }

    /**
     * 获取区域在网格中的位置
     */
    getRegionPosition(index, rows, cols) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const positions = [
            'top-left', 'top-center', 'top-right',
            'middle-left', 'center', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right'
        ];
        
        return positions[index] || 'center';
    }

    /**
     * 找到最适合隐藏二维码的位置
     */
    findBestHidingPosition(regions) {
        // 排除中心区域（通常是主要内容）
        const candidateRegions = regions.filter(region => region.position !== 'center');
        
        // 按纹理得分排序，选择纹理最复杂的区域
        candidateRegions.sort((a, b) => b.textureScore - a.textureScore);
        
        return candidateRegions[0] || regions[0];
    }

    /**
     * 根据分析结果生成推荐设置
     */
    generateRecommendedSettings(bestRegion) {
        if (!bestRegion) return null;

        const settings = {
            opacity: 0.3,
            blendMode: 'multiply',
            position: bestRegion.position,
            size: 150,
            edgeStrength: 0.5,
            textureAdaption: 0.7
        };

        // 根据区域特征调整参数
        if (bestRegion.contrast > 0.6) {
            settings.opacity = 0.2; // 高对比度区域使用更低透明度
            settings.blendMode = 'soft-light';
        } else if (bestRegion.contrast < 0.3) {
            settings.opacity = 0.4; // 低对比度区域使用更高透明度
            settings.blendMode = 'overlay';
        }

        if (bestRegion.textureScore > 0.7) {
            settings.edgeStrength = 0.3; // 高纹理区域减少边缘强化
            settings.textureAdaption = 0.8;
        } else {
            settings.edgeStrength = 0.7; // 低纹理区域增强边缘
            settings.textureAdaption = 0.5;
        }

        return settings;
    }

    /**
     * 显示分析结果
     */
    displayAnalysisResults(analysis) {
        const resultsContainer = document.getElementById('analysisResults');
        if (!resultsContainer) return;

        const bestRegion = analysis.bestPosition;
        const settings = analysis.recommendedSettings;

        resultsContainer.innerHTML = `
            <div class="analysis-summary">
                <h4>🎯 智能分析结果</h4>
                <div class="analysis-item">
                    <span class="label">推荐位置:</span>
                    <span class="value">${this.translatePosition(bestRegion.position)}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">纹理得分:</span>
                    <span class="value">${(bestRegion.textureScore * 100).toFixed(1)}%</span>
                </div>
                <div class="analysis-item">
                    <span class="label">对比度:</span>
                    <span class="value">${(bestRegion.contrast * 100).toFixed(1)}%</span>
                </div>
                <div class="analysis-item">
                    <span class="label">推荐透明度:</span>
                    <span class="value">${settings.opacity}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">推荐混合模式:</span>
                    <span class="value">${this.translateBlendMode(settings.blendMode)}</span>
                </div>
            </div>
            <button id="applyRecommended" class="primary-btn" style="margin-top: 15px;">
                ✨ 应用推荐设置
            </button>
        `;

        // 添加应用推荐设置的事件监听器
        document.getElementById('applyRecommended').addEventListener('click', () => {
            this.applyRecommendedSettings(settings);
        });

        resultsContainer.style.display = 'block';
    }

    /**
     * 应用推荐设置
     */
    applyRecommendedSettings(settings) {
        document.getElementById('opacity').value = settings.opacity;
        document.getElementById('opacityValue').textContent = settings.opacity;
        
        document.getElementById('blendMode').value = settings.blendMode;
        document.getElementById('position').value = settings.position;
        
        document.getElementById('size').value = settings.size;
        document.getElementById('sizeValue').textContent = settings.size + 'px';

        // 应用高级设置
        const edgeStrengthSlider = document.getElementById('edgeStrength');
        if (edgeStrengthSlider) {
            edgeStrengthSlider.value = settings.edgeStrength;
            document.getElementById('edgeStrengthValue').textContent = settings.edgeStrength;
        }

        const textureAdaptionSlider = document.getElementById('textureAdaption');
        if (textureAdaptionSlider) {
            textureAdaptionSlider.value = settings.textureAdaption;
            document.getElementById('textureAdaptionValue').textContent = settings.textureAdaption;
        }

        this.showToast('已应用推荐设置！', 'success');
        this.updateRealTimePreview();
    }

    // ==================== 阶段2：智能融合算法 ====================

    /**
     * 高级图像处理主函数
     */
    processImagesAdvanced() {
        if (!this.qrImage || !this.bgImage) {
            this.showToast('请先上传二维码和背景图片！', 'error');
            return;
        }

        const processBtn = document.getElementById('processBtn');
        const originalText = processBtn.innerHTML;
        processBtn.innerHTML = '<span class="loading"></span> 智能处理中...';
        processBtn.disabled = true;

        // 使用 setTimeout 让 UI 有时间更新
        setTimeout(() => {
            try {
                this.performAdvancedBlending();
                document.getElementById('resultSection').style.display = 'block';
                document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
                this.showToast('处理完成！', 'success');
            } catch (error) {
                console.error('处理图片时出错:', error);
                this.showToast('处理图片时出错，请重试！', 'error');
            } finally {
                processBtn.innerHTML = originalText;
                processBtn.disabled = false;
            }
        }, 100);
    }

    /**
     * 执行高级融合算法
     */
    performAdvancedBlending() {
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
        const edgeStrength = parseFloat(document.getElementById('edgeStrength')?.value || 0.5);
        const textureAdaption = parseFloat(document.getElementById('textureAdaption')?.value || 0.7);
        
        // 计算二维码位置
        const qrPos = this.calculateQRPosition(position, size);
        
        // 获取背景区域数据用于智能融合
        const bgRegionData = ctx.getImageData(qrPos.x, qrPos.y, size, size);
        
        // 创建二维码处理画布
        const qrCanvas = document.createElement('canvas');
        const qrCtx = qrCanvas.getContext('2d');
        qrCanvas.width = size;
        qrCanvas.height = size;
        
        // 绘制调整大小后的二维码
        qrCtx.drawImage(this.qrImage, 0, 0, size, size);
        const qrImageData = qrCtx.getImageData(0, 0, size, size);
        
        // 执行像素级智能融合
        const blendedImageData = this.pixelLevelIntelligentBlending(
            qrImageData, 
            bgRegionData, 
            {
                opacity,
                blendMode,
                edgeStrength,
                textureAdaption,
                analysisResult: this.analysisResult
            }
        );
        
        // 将融合结果绘制到主画布
        ctx.putImageData(blendedImageData, qrPos.x, qrPos.y);
    }

    /**
     * 像素级智能融合算法
     */
    pixelLevelIntelligentBlending(qrImageData, bgImageData, params) {
        const result = new ImageData(qrImageData.width, qrImageData.height);
        const { opacity, edgeStrength, textureAdaption } = params;
        
        // 预计算边缘检测
        const qrEdges = this.detectEdges(qrImageData);
        const bgTexture = this.analyzeLocalTexture(bgImageData);
        
        for (let i = 0; i < qrImageData.data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % qrImageData.width;
            const y = Math.floor(pixelIndex / qrImageData.width);
            
            // 获取原始像素值
            const qrR = qrImageData.data[i];
            const qrG = qrImageData.data[i + 1];
            const qrB = qrImageData.data[i + 2];
            const qrA = qrImageData.data[i + 3];
            
            const bgR = bgImageData.data[i];
            const bgG = bgImageData.data[i + 1];
            const bgB = bgImageData.data[i + 2];
            const bgA = bgImageData.data[i + 3];
            
            // 计算二维码像素的重要性（边缘像素更重要）
            const qrImportance = this.calculateQRPixelImportance(qrR, qrG, qrB, qrEdges[pixelIndex]);
            
            // 计算背景纹理强度
            const bgTextureStrength = bgTexture[pixelIndex] || 0;
            
            // 自适应融合强度
            let adaptiveOpacity = opacity;
            
            // 在高纹理区域降低二维码透明度，增强隐藏效果
            if (bgTextureStrength > 0.6) {
                adaptiveOpacity *= (1 - textureAdaption * 0.3);
            }
            
            // 对二维码的关键像素（边缘、角点）保持更高可见性
            if (qrImportance > 0.8) {
                adaptiveOpacity *= (1 + edgeStrength * 0.5);
            }
            
            // 执行智能颜色融合
            const blendedColor = this.intelligentColorBlending(
                [qrR, qrG, qrB], 
                [bgR, bgG, bgB],
                adaptiveOpacity,
                params.blendMode,
                bgTextureStrength
            );
            
            // 设置结果像素
            result.data[i] = blendedColor[0];
            result.data[i + 1] = blendedColor[1];
            result.data[i + 2] = blendedColor[2];
            result.data[i + 3] = Math.max(qrA, bgA);
        }
        
        return result;
    }

    /**
     * 检测二维码边缘
     */
    detectEdges(imageData) {
        const edges = new Array(imageData.width * imageData.height).fill(0);
        
        for (let y = 1; y < imageData.height - 1; y++) {
            for (let x = 1; x < imageData.width - 1; x++) {
                const idx = y * imageData.width + x;
                const centerIdx = idx * 4;
                
                // 计算中心像素亮度
                const centerLum = 0.299 * imageData.data[centerIdx] + 
                                 0.587 * imageData.data[centerIdx + 1] + 
                                 0.114 * imageData.data[centerIdx + 2];
                
                // 计算8邻域的亮度差异
                let maxDiff = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const neighborIdx = ((y + dy) * imageData.width + (x + dx)) * 4;
                        const neighborLum = 0.299 * imageData.data[neighborIdx] + 
                                          0.587 * imageData.data[neighborIdx + 1] + 
                                          0.114 * imageData.data[neighborIdx + 2];
                        
                        maxDiff = Math.max(maxDiff, Math.abs(centerLum - neighborLum));
                    }
                }
                
                edges[idx] = maxDiff / 255;
            }
        }
        
        return edges;
    }

    /**
     * 分析局部纹理强度
     */
    analyzeLocalTexture(imageData) {
        const texture = new Array(imageData.width * imageData.height).fill(0);
        const windowSize = 5; // 5x5窗口
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let y = halfWindow; y < imageData.height - halfWindow; y++) {
            for (let x = halfWindow; x < imageData.width - halfWindow; x++) {
                const idx = y * imageData.width + x;
                
                // 计算局部方差作为纹理强度指标
                let sum = 0;
                let sumSq = 0;
                let count = 0;
                
                for (let dy = -halfWindow; dy <= halfWindow; dy++) {
                    for (let dx = -halfWindow; dx <= halfWindow; dx++) {
                        const pixelIdx = ((y + dy) * imageData.width + (x + dx)) * 4;
                        const lum = 0.299 * imageData.data[pixelIdx] + 
                                   0.587 * imageData.data[pixelIdx + 1] + 
                                   0.114 * imageData.data[pixelIdx + 2];
                        
                        sum += lum;
                        sumSq += lum * lum;
                        count++;
                    }
                }
                
                const mean = sum / count;
                const variance = (sumSq / count) - (mean * mean);
                texture[idx] = Math.min(Math.sqrt(variance) / 255, 1);
            }
        }
        
        return texture;
    }

    /**
     * 计算二维码像素的重要性
     */
    calculateQRPixelImportance(r, g, b, edgeStrength) {
        // 二维码通常是黑白的，计算与纯黑/纯白的距离
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const blackDistance = luminance / 255;
        const whiteDistance = (255 - luminance) / 255;
        
        // 越接近黑色或白色，重要性越高
        const colorImportance = 1 - Math.min(blackDistance, whiteDistance);
        
        // 边缘像素重要性更高
        const finalImportance = colorImportance * 0.7 + edgeStrength * 0.3;
        
        return Math.min(finalImportance, 1);
    }

    /**
     * 智能颜色融合算法
     */
    intelligentColorBlending(qrColor, bgColor, opacity, blendMode, textureStrength) {
        // 根据纹理强度调整融合策略
        let effectiveOpacity = opacity;
        
        // 在高纹理区域使用更复杂的融合算法
        if (textureStrength > 0.5) {
            // 使用颜色空间转换进行更自然的融合
            const qrLab = this.rgbToLab(qrColor);
            const bgLab = this.rgbToLab(bgColor);
            
            // 在LAB空间进行融合，保持更好的感知效果
            const blendedLab = [
                bgLab[0] + (qrLab[0] - bgLab[0]) * effectiveOpacity,
                bgLab[1] + (qrLab[1] - bgLab[1]) * effectiveOpacity,
                bgLab[2] + (qrLab[2] - bgLab[2]) * effectiveOpacity
            ];
            
            return this.labToRgb(blendedLab);
        } else {
            // 在低纹理区域使用传统融合模式
            return this.applyBlendMode(qrColor, bgColor, effectiveOpacity, blendMode);
        }
    }

    /**
     * RGB到LAB颜色空间转换
     */
    rgbToLab(rgb) {
        // 简化的RGB到LAB转换
        let [r, g, b] = rgb.map(c => c / 255);
        
        // RGB to XYZ
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        // XYZ to LAB
        x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
        y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
        z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
        
        return [
            (116 * y) - 16,
            500 * (x - y),
            200 * (y - z)
        ];
    }

    /**
     * LAB到RGB颜色空间转换
     */
    labToRgb(lab) {
        let [l, a, b] = lab;
        
        // LAB to XYZ
        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;
        
        x = Math.pow(x, 3) > 0.008856 ? Math.pow(x, 3) : (x - 16/116) / 7.787;
        y = Math.pow(y, 3) > 0.008856 ? Math.pow(y, 3) : (y - 16/116) / 7.787;
        z = Math.pow(z, 3) > 0.008856 ? Math.pow(z, 3) : (z - 16/116) / 7.787;
        
        x *= 0.95047;
        y *= 1.00000;
        z *= 1.08883;
        
        // XYZ to RGB
        let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        let bb = x * 0.0557 + y * -0.2040 + z * 1.0570;
        
        r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
        g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
        bb = bb > 0.0031308 ? 1.055 * Math.pow(bb, 1/2.4) - 0.055 : 12.92 * bb;
        
        return [
            Math.max(0, Math.min(255, Math.round(r * 255))),
            Math.max(0, Math.min(255, Math.round(g * 255))),
            Math.max(0, Math.min(255, Math.round(bb * 255)))
        ];
    }

    /**
     * 应用传统混合模式
     */
    applyBlendMode(qrColor, bgColor, opacity, blendMode) {
        const [qrR, qrG, qrB] = qrColor;
        const [bgR, bgG, bgB] = bgColor;
        
        let blendedR, blendedG, blendedB;
        
        switch (blendMode) {
            case 'multiply':
                blendedR = (qrR * bgR) / 255;
                blendedG = (qrG * bgG) / 255;
                blendedB = (qrB * bgB) / 255;
                break;
            case 'overlay':
                blendedR = bgR < 128 ? (2 * qrR * bgR) / 255 : 255 - (2 * (255 - qrR) * (255 - bgR)) / 255;
                blendedG = bgG < 128 ? (2 * qrG * bgG) / 255 : 255 - (2 * (255 - qrG) * (255 - bgG)) / 255;
                blendedB = bgB < 128 ? (2 * qrB * bgB) / 255 : 255 - (2 * (255 - qrB) * (255 - bgB)) / 255;
                break;
            case 'soft-light':
                blendedR = bgR < 128 ? (2 * qrR * bgR) / 255 + (qrR * qrR * (255 - 2 * bgR)) / (255 * 255) :
                          qrR * (255 + (2 * bgR - 255) * (255 - qrR) / 255) / 255;
                blendedG = bgG < 128 ? (2 * qrG * bgG) / 255 + (qrG * qrG * (255 - 2 * bgG)) / (255 * 255) :
                          qrG * (255 + (2 * bgG - 255) * (255 - qrG) / 255) / 255;
                blendedB = bgB < 128 ? (2 * qrB * bgB) / 255 + (qrB * qrB * (255 - 2 * bgB)) / (255 * 255) :
                          qrB * (255 + (2 * bgB - 255) * (255 - qrB) / 255) / 255;
                break;
            default:
                // 默认使用正常混合
                blendedR = bgR + (qrR - bgR) * opacity;
                blendedG = bgG + (qrG - bgG) * opacity;
                blendedB = bgB + (qrB - bgB) * opacity;
                return [Math.round(blendedR), Math.round(blendedG), Math.round(blendedB)];
        }
        
        // 应用透明度
        const finalR = bgR + (blendedR - bgR) * opacity;
        const finalG = bgG + (blendedG - bgG) * opacity;
        const finalB = bgB + (blendedB - bgB) * opacity;
        
        return [
            Math.max(0, Math.min(255, Math.round(finalR))),
            Math.max(0, Math.min(255, Math.round(finalG))),
            Math.max(0, Math.min(255, Math.round(finalB)))
        ];
    }

    // ==================== 实时预览功能 ====================

    /**
     * 更新实时预览
     */
    updateRealTimePreview() {
        if (!this.qrImage || !this.bgImage) return;
        
        // 防抖处理
        clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => {
            this.generateQuickPreview();
        }, 300);
    }

    /**
     * 生成快速预览（降采样版本）
     */
    generateQuickPreview() {
        const previewCanvas = document.getElementById('quickPreview');
        if (!previewCanvas) return;
        
        const ctx = previewCanvas.getContext('2d');
        const scale = 0.5; // 50%缩放用于快速预览
        
        previewCanvas.width = this.bgImage.width * scale;
        previewCanvas.height = this.bgImage.height * scale;
        
        // 绘制缩放后的背景
        ctx.drawImage(this.bgImage, 0, 0, previewCanvas.width, previewCanvas.height);
        
        // 获取当前参数
        const opacity = parseFloat(document.getElementById('opacity').value);
        const blendMode = document.getElementById('blendMode').value;
        const position = document.getElementById('position').value;
        const size = parseInt(document.getElementById('size').value) * scale;
        
        // 计算二维码位置
        const qrPos = this.calculateQRPosition(position, size, previewCanvas.width, previewCanvas.height);
        
        // 应用混合设置并绘制二维码
        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = blendMode;
        ctx.drawImage(this.qrImage, qrPos.x, qrPos.y, size, size);
        
        // 重置设置
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    // ==================== 工具函数 ====================

    calculateQRPosition(position, size, canvasWidth = null, canvasHeight = null) {
        const width = canvasWidth || this.bgImage.width;
        const height = canvasHeight || this.bgImage.height;
        
        // 计算中心点
        const centerX = (width - size) / 2;
        const centerY = (height - size) / 2;
        
        // 偏移量：从中心向各方向偏移的距离
        const offsetRatioX = 0.25;
        const offsetRatioY = 0.25;
        
        const offsetX = width * offsetRatioX * 0.5;
        const offsetY = height * offsetRatioY * 0.5;
        
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
        x = Math.max(10, Math.min(x, width - size - 10));
        y = Math.max(10, Math.min(y, height - size - 10));
        
        return { x, y };
    }

    translatePosition(position) {
        const translations = {
            'top-left': '左上角',
            'top-center': '上方中心',
            'top-right': '右上角',
            'middle-left': '左侧中心',
            'center': '中心',
            'middle-right': '右侧中心',
            'bottom-left': '左下角',
            'bottom-center': '下方中心',
            'bottom-right': '右下角'
        };
        return translations[position] || position;
    }

    translateBlendMode(blendMode) {
        const translations = {
            'multiply': '正片叠底',
            'overlay': '叠加',
            'soft-light': '柔光',
            'hard-light': '强光',
            'color-burn': '颜色加深',
            'darken': '变暗'
        };
        return translations[blendMode] || blendMode;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ff4757' : type === 'success' ? '#2ed573' : '#4facfe'};
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

    downloadResult() {
        const canvas = document.getElementById('resultCanvas');
        const link = document.createElement('a');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `advanced-hidden-qr-${timestamp}.png`;
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        }, 'image/png', 0.95);
    }

    reset() {
        this.qrImage = null;
        this.bgImage = null;
        this.analysisResult = null;
        
        document.getElementById('qrInput').value = '';
        document.getElementById('bgInput').value = '';
        
        document.getElementById('qrPreview').innerHTML = '';
        document.getElementById('bgPreview').innerHTML = '';
        
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('resultSection').style.display = 'none';
        
        const analysisResults = document.getElementById('analysisResults');
        if (analysisResults) {
            analysisResults.style.display = 'none';
        }
        
        // 重置所有控制参数
        document.getElementById('opacity').value = 0.3;
        document.getElementById('opacityValue').textContent = '0.3';
        document.getElementById('size').value = 150;
        document.getElementById('sizeValue').textContent = '150px';
        document.getElementById('blendMode').value = 'multiply';
        document.getElementById('position').value = 'center';
        
        // 重置高级参数
        const edgeStrengthSlider = document.getElementById('edgeStrength');
        if (edgeStrengthSlider) {
            edgeStrengthSlider.value = 0.5;
            document.getElementById('edgeStrengthValue').textContent = '0.5';
        }
        
        const textureAdaptionSlider = document.getElementById('textureAdaption');
        if (textureAdaptionSlider) {
            textureAdaptionSlider.value = 0.7;
            document.getElementById('textureAdaptionValue').textContent = '0.7';
        }
    }

    newProcess() {
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('controlsSection').style.display = 'block';
    }
}

// 页面加载完成后初始化高级版本
function initializeAdvancedApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AdvancedQRCodeHider();
        });
    } else {
        new AdvancedQRCodeHider();
    }
}

// 导出类供外部使用
window.AdvancedQRCodeHider = AdvancedQRCodeHider;
