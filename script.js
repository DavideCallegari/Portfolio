(() => {
    'use strict';

    const TOTAL_PHOTOS = 68;
    const pad3 = (n) => String(n).padStart(3, '0');

    function getPhotoSection(num) {
        if (num <= 18) return 1;
        if (num <= 39) return 2;
        if (num <= 56) return 3;
        return 4;
    }

    function copyText(text, toastEl, statusEl, successMessage) {
        if (!navigator.clipboard?.writeText) {
            if (statusEl) statusEl.textContent = 'Copia non disponibile in questo browser.';
            if (toastEl) showToast(toastEl, 'Errore');
            return Promise.reject(new Error('Clipboard API non disponibile'));
        }

        return navigator.clipboard.writeText(text).then(() => {
            if (statusEl) statusEl.textContent = successMessage;
            if (toastEl) showToast(toastEl, 'Copiato!');
        }).catch((error) => {
            if (statusEl) statusEl.textContent = 'Impossibile copiare negli appunti.';
            if (toastEl) showToast(toastEl, 'Errore');
            throw error;
        });
    }

    function showToast(toastEl, message) {
        toastEl.textContent = message;
        toastEl.classList.toggle('error', message === 'Errore');
        toastEl.classList.add('show');
        clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 1800);
    }

    /* =========================================================
       1. HERO VIDEO (SINCRONIZZAZIONE BIDIREZIONALE CON YOUTUBE)
       ========================================================= */
    const heroContainer = document.getElementById('heroContainer');
    const heroOverlay = document.getElementById('heroOverlay');
    const heroSoundBtn = document.getElementById('heroSoundBtn');
    const heroIframe = document.getElementById('heroIframe');
    let heroUnmuted = false;

    function sendYtCommand(iframeEl, func, args = []) {
        if (!iframeEl || !iframeEl.contentWindow) return;
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube.com');
    }

    function syncHeroSoundUi(unmuted) {
        heroUnmuted = unmuted;
        if (!heroSoundBtn) return;
        heroSoundBtn.classList.toggle('unmuted', unmuted);
        const label = unmuted ? 'Disattiva audio' : 'Attiva audio';
        heroSoundBtn.setAttribute('title', label);
        heroSoundBtn.setAttribute('aria-label', label);
    }

    function initYtListening() {
        if (!heroIframe || !heroIframe.contentWindow) return;
        heroIframe.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'heroIframe' }), 'https://www.youtube.com');
    }

    if (heroIframe) {
        heroIframe.addEventListener('load', initYtListening);
        initYtListening();
    }

    window.addEventListener('message', (e) => {
        if (e.origin !== 'https://www.youtube.com' || e.source !== heroIframe?.contentWindow) return;
        try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            if (data?.event === 'infoDelivery' && data.info) {
                if (typeof data.info.muted === 'boolean' || typeof data.info.volume === 'number') {
                    const isMuted = data.info.muted ?? !heroUnmuted;
                    const vol = data.info.volume ?? 100;
                    syncHeroSoundUi(!isMuted && vol > 0);
                }
            }
        } catch (_) {}
    });

    function toggleHeroSound() {
        if (!heroUnmuted) {
            sendYtCommand(heroIframe, 'unMute');
            sendYtCommand(heroIframe, 'setVolume', [100]);
            heroContainer.classList.add('interactive');
            syncHeroSoundUi(true);
        } else {
            sendYtCommand(heroIframe, 'mute');
            syncHeroSoundUi(false);
        }
    }

    if (heroOverlay) heroOverlay.addEventListener('click', toggleHeroSound);
    if (heroSoundBtn) heroSoundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleHeroSound();
    });

    /* =========================================================
       2. CASSETTO BIO ("chi sono")
       ========================================================= */
    const bioArrowBtn = document.getElementById('bioArrowBtn');
    const bioDrawer = document.getElementById('bioDrawer');

    if (bioArrowBtn && bioDrawer) {
        bioDrawer.inert = true;
        bioArrowBtn.addEventListener('click', () => {
            const isOpen = bioDrawer.classList.toggle('open');
            bioArrowBtn.classList.toggle('open', isOpen);
            bioArrowBtn.setAttribute('aria-expanded', String(isOpen));
            bioDrawer.inert = !isOpen;
        });
    }

    /* =========================================================
       3. PULSANTE VIAGGIO (UNICA LOGICA REATTIVA ALLO SCROLL)
       ========================================================= */
    const magicTravelBtn = document.getElementById('magicTravelBtn');
    const contactFooter = document.getElementById('contactFooter');
    let isAtBottom = false;
    let travelAnimId = null;
    let lastTravelY = '';

    // Unica fonte di verità: posiziona il bottone in base a quanto il footer entra nello schermo
    function syncTravelBtn() {
        if (!magicTravelBtn || !contactFooter) return;
        const rect = contactFooter.getBoundingClientRect();
        const visibleFooter = Math.max(0, window.innerHeight - rect.top);
        const progress = Math.min(1, visibleFooter / Math.max(1, rect.height));
        const maxLift = window.innerWidth <= 650 ? 8 : 76;
        const nextTravelY = `-${(progress * maxLift).toFixed(1)}px`;

        if (nextTravelY !== lastTravelY) {
            lastTravelY = nextTravelY;
            magicTravelBtn.style.setProperty('--travel-y', nextTravelY);
        }

        // Durante il volo automatico cambia icona solo a fine corsa; a mano cambia appena entra nel footer
        if (!travelAnimId) {
            setBalloonMode(progress > 0.15);
        }
    }

    function setBalloonMode(atBottom) {
        if (isAtBottom === atBottom || !magicTravelBtn) return;
        isAtBottom = atBottom;
        magicTravelBtn.classList.toggle('is-balloon', atBottom);
        magicTravelBtn.setAttribute('aria-label', atBottom ? 'Torna in cima' : 'Vai ai contatti');
        magicTravelBtn.setAttribute('title', atBottom ? 'Torna su' : 'Contatti');
    }

    function cancelTravel() {
        if (travelAnimId) {
            cancelAnimationFrame(travelAnimId);
            travelAnimId = null;
            syncTravelBtn();
        }
    }

    function cancelTravelOnKeydown(e) {
        if (!travelAnimId) return;

        const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
        const isSpace = e.code === 'Space';
        if (!scrollKeys.includes(e.key) && !isSpace) return;

        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
        if (isSpace && target?.closest('button')) return;

        cancelTravel();
    }

    window.addEventListener('wheel', cancelTravel, { passive: true });
    window.addEventListener('touchstart', cancelTravel, { passive: true });
    window.addEventListener('keydown', cancelTravelOnKeydown);
    window.addEventListener('scroll', syncTravelBtn, { passive: true });
    window.addEventListener('resize', syncTravelBtn, { passive: true });

    function flyTo(goingUp) {
        cancelTravel();

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            window.scrollTo(0, goingUp ? 0 : Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
            syncTravelBtn();
            return;
        }

        const startY = window.scrollY;
        const startTime = performance.now();
        const duration = goingUp ? 1800 : 950;

        function step(now) {
            const t = Math.min((now - startTime) / duration, 1);
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            const targetY = goingUp ? 0 : Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

            window.scrollTo(0, startY + (targetY - startY) * ease);

            if (t < 1) {
                travelAnimId = requestAnimationFrame(step);
            } else {
                travelAnimId = null;
                window.scrollTo(0, goingUp ? 0 : Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
                setBalloonMode(!goingUp);
                syncTravelBtn();
            }
        }

        travelAnimId = requestAnimationFrame(step);
    }

    if (magicTravelBtn && contactFooter) {
        syncTravelBtn();
        magicTravelBtn.addEventListener('click', () => flyTo(isAtBottom));
    }

    /* =========================================================
       4. GRIGLIA FOTOGRAFICA DINAMICA (MASONRY + STAMPA PDF)
       ========================================================= */
    const photoGrids = Array.from(document.querySelectorAll('.photo-grid'));
    const gridCaches = new Map();
    let currentColsCount = window.innerWidth <= 950 ? 2 : 3;

    function revealImageWithFade(img) {
        const show = () => requestAnimationFrame(() => img.classList.add('loaded'));
        if (typeof img.decode === 'function') img.decode().then(show).catch(show);
        else show();
    }

    function createPhotoNode(num) {
        const idStr = pad3(num);
        const link = document.createElement('a');
        link.href = `img/img${idStr}.jpg`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.dataset.photoNum = String(num);
        link.setAttribute('aria-label', `Apri fotografia ${num}`);

        const picture = document.createElement('picture');

        const source = document.createElement('source');
        source.srcset = `img/webp/img${idStr}.webp`;
        source.type = 'image/webp';

        const img = document.createElement('img');
        img.src = `img/img${idStr}.jpg`;
        img.alt = `Fotografia ${num} — Davide Callegari`;
        img.decoding = 'async';

        if (num <= 3) img.fetchPriority = 'high';
        else if (num > 6) img.loading = 'lazy';

        if (img.complete && img.naturalWidth > 0) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => revealImageWithFade(img), { once: true });
            img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
        }

        picture.append(source, img);
        link.append(picture);
        return link;
    }

    function renderGrids(colsCount) {
        photoGrids.forEach((grid) => {
            let items = gridCaches.get(grid);
            if (!items) {
                const start = parseInt(grid.dataset.start, 10);
                const end = parseInt(grid.dataset.end, 10);
                items = [];
                for (let n = start; n <= end; n++) items.push(createPhotoNode(n));
                gridCaches.set(grid, items);
            }

            const cols = Array.from({ length: colsCount }, () => {
                const col = document.createElement('div');
                col.className = 'masonry-col';
                return col;
            });

            items.forEach((node, idx) => cols[idx % colsCount].appendChild(node));
            grid.replaceChildren(...cols);
        });
    }

    renderGrids(currentColsCount);

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const nextCols = window.innerWidth <= 950 ? 2 : 3;
            if (nextCols !== currentColsCount) {
                currentColsCount = nextCols;
                renderGrids(currentColsCount);
            }
        }, 120);
    });

    window.addEventListener('beforeprint', () => {
        if (currentColsCount !== 3) renderGrids(3);
        document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            img.dataset.restoreLazyLoading = 'true';
            img.loading = 'eager';
        });
    });

    window.addEventListener('afterprint', () => {
        document.querySelectorAll('img[data-restore-lazy-loading="true"]').forEach((img) => {
            img.loading = 'lazy';
            delete img.dataset.restoreLazyLoading;
        });
        if (currentColsCount !== 3) renderGrids(currentColsCount);
    });

    /* =========================================================
       5. VIDEO YOUTUBE, REEL INSTAGRAM E FOTO BACKSTAGE
       ========================================================= */
    function pauseAllOtherVideos(currentItem) {
        if (heroUnmuted) {
            sendYtCommand(heroIframe, 'mute');
            syncHeroSoundUi(false);
        }
        document.querySelectorAll('.video-item[data-playing="true"]').forEach((other) => {
            if (other !== currentItem) sendYtCommand(other.querySelector('iframe'), 'pauseVideo');
        });
        document.querySelectorAll('.reel-item[data-playing="true"]').forEach((other) => {
            if (other === currentItem) return;
            const thumbnail = other.querySelector('picture');
            const playButton = other.querySelector('.custom-play-btn');
            if (thumbnail && playButton) other.replaceChildren(thumbnail, playButton);
            delete other.dataset.playing;
            other.closest('.media-card')?.classList.remove('is-active');
        });
    }

    function activateVideoItem(item) {
        pauseAllOtherVideos(item);
        if (item.dataset.playing === 'true') return;
        item.dataset.playing = 'true';

        item.closest('.media-card')?.classList.add('is-active');

        const { videoId, reelId } = item.dataset;
        const iframe = document.createElement('iframe');
        iframe.title = item.getAttribute('aria-label') || 'Video player';

        if (videoId) {
            iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1&playsinline=1`;
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            iframe.allowFullscreen = true;
        } else if (reelId) {
            iframe.className = 'ig-embed-clean';
            iframe.src = `https://www.instagram.com/reel/${reelId}/embed/`;
            iframe.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
            iframe.scrolling = 'no';
        }
        item.replaceChildren(iframe);
    }

    document.querySelectorAll('.video-item, .reel-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.pdf-video-link')) activateVideoItem(item);
        });
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateVideoItem(item);
            }
        });
    });

    const BTS_CAT_CONFIG = {
        1: { symbol: '#cat-pose-top', cls: 'cat-top-left' },
        3: { symbol: '#cat-pose-top', cls: 'cat-top' },
        5: { symbol: '#cat-pose-side', cls: 'cat-side-left' },
        7: { symbol: '#cat-pose-side', cls: 'cat-side-right' }
    };

    function populateBtsLayer(wrapper) {
        const layer = wrapper.querySelector('.bts-layer');
        if (!layer || layer.children.length > 0) return;

        const startNum = parseInt(wrapper.dataset.btsStart, 10) || 1;
        const frag = document.createDocumentFragment();

        for (let i = 1; i <= 7; i++) {
            const btsNum = pad3(startNum + i - 1);
            const card = document.createElement('div');
            card.className = `bts-card bts-pos-${i}`;

            const catCfg = BTS_CAT_CONFIG[i];
            if (catCfg) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', `leaning-cat ${catCfg.cls}`);
                const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                use.setAttribute('href', catCfg.symbol);
                svg.appendChild(use);
                card.appendChild(svg);
            }

            const picture = document.createElement('picture');
            const source = document.createElement('source');
            source.srcset = `img/webp/bts${btsNum}.webp`;
            source.type = 'image/webp';

            const img = document.createElement('img');
            img.src = `img/bts${btsNum}.jpg`;
            img.alt = `Backstage ${btsNum}`;
            img.loading = 'lazy';
            img.decoding = 'async';

            picture.append(source, img);
            card.appendChild(picture);
            frag.appendChild(card);
        }

        layer.appendChild(frag);
    }

    document.querySelectorAll('.video-strip-wrapper[data-bts-start]').forEach((wrapper) => {
        const btn = wrapper.querySelector('.cat-toggle-btn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            populateBtsLayer(wrapper);
            const isShowing = wrapper.classList.toggle('show-bts');
            btn.classList.toggle('active', isShowing);
            btn.setAttribute('aria-expanded', String(isShowing));
            btn.setAttribute('aria-label', isShowing ? 'Nascondi foto backstage' : 'Mostra foto backstage');
            btn.classList.remove('pop-anim');
            void btn.offsetWidth;
            btn.classList.add('pop-anim');
        });
    });

    /* =========================================================
       6. LIGHTBOX WHIMSY (CACHE SET + TASTO INDIETRO MOBILE)
       ========================================================= */
    const lbModal = document.getElementById('lightboxModal');
    const lbStage = document.getElementById('lightboxStage');
    const lbImg = document.getElementById('lightboxImg');
    const lbCloseBtn = document.getElementById('lbCloseBtn');
    const lbPrevBtn = document.getElementById('lbPrevBtn');
    const lbNextBtn = document.getElementById('lbNextBtn');
    const lbShareBtn = document.getElementById('lbShareBtn');
    const shareToast = document.getElementById('shareToast');

    let currentPhoto = 1;
    let isLbOpen = false;
    let lastFocusedEl = null;
    let activeLoadToken = 0;
    const preloadedSet = new Set();

    function preloadAdjacentPhotos(num) {
        const prev = num > 1 ? num - 1 : TOTAL_PHOTOS;
        const next = num < TOTAL_PHOTOS ? num + 1 : 1;
        [prev, next].forEach((n) => {
            if (preloadedSet.has(n)) return;
            const pre = new Image();
            pre.onload = () => preloadedSet.add(n);
            pre.src = `img/img${pad3(n)}.jpg`;
        });
    }

    function updateUrlParam(num, push = false) {
        const url = new URL(window.location.href);
        if (num) url.searchParams.set('photo', num);
        else url.searchParams.delete('photo');

        if (push) window.history.pushState({ lb: true }, '', url);
        else window.history.replaceState(window.history.state, '', url);
    }

    function showPhoto(num, isInitialOpen = false) {
        currentPhoto = ((num - 1 + TOTAL_PHOTOS) % TOTAL_PHOTOS) + 1;
        const idStr = pad3(currentPhoto);
        const webpSrc = `img/webp/img${idStr}.webp`;
        const jpgSrc = `img/img${idStr}.jpg`;
        const token = ++activeLoadToken;

        lbStage.dataset.section = String(getPhotoSection(currentPhoto));
        lbImg.alt = `Fotografia ${currentPhoto} — Davide Callegari`;
        lbImg.src = preloadedSet.has(currentPhoto) ? jpgSrc : webpSrc;

        const hiResLoader = new Image();
        const photoToCache = currentPhoto;
        const upgradeToHiRes = () => {
            preloadedSet.add(photoToCache);
            if (token === activeLoadToken) lbImg.src = jpgSrc;
        };

        hiResLoader.onload = upgradeToHiRes;
        hiResLoader.src = jpgSrc;
        if (hiResLoader.complete && hiResLoader.naturalWidth > 0) upgradeToHiRes();

        updateUrlParam(currentPhoto, isInitialOpen);
        preloadAdjacentPhotos(currentPhoto);
    }

    function openLightbox(num, triggerEl = null, fromUrl = false, fromPopState = false) {
        lastFocusedEl = triggerEl || document.activeElement;
        isLbOpen = true;

        if (fromUrl) {
            updateUrlParam(null, false);
        }

        showPhoto(num, !fromPopState);
        lbModal.classList.add('open');
        lbModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        lbCloseBtn.focus({ preventScroll: true });
    }

    function closeLightbox(fromPopState = false) {
        if (!isLbOpen) return;
        isLbOpen = false;
        activeLoadToken++;
        lbModal.classList.remove('open');
        lbModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (!fromPopState && window.history.state?.lb) {
            window.history.back();
        } else {
            updateUrlParam(null, false);
        }

        if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
            lastFocusedEl.focus({ preventScroll: true });
        }
    }

    // Sincronizza l'apertura/chiusura del Lightbox con i tasti Indietro/Avanti del browser
    window.addEventListener('popstate', () => {
        const photoParam = parseInt(new URLSearchParams(window.location.search).get('photo'), 10);
        if (isLbOpen && !photoParam) {
            closeLightbox(true);
        } else if (isLbOpen && photoParam >= 1 && photoParam <= TOTAL_PHOTOS) {
            showPhoto(photoParam, false);
        } else if (!isLbOpen && photoParam >= 1 && photoParam <= TOTAL_PHOTOS) {
            openLightbox(photoParam, lastFocusedEl, false, true);
        }
    });

    photoGrids.forEach((grid) => {
        grid.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-photo-num]');
            if (!link) return;

            // Il click normale apre il lightbox; i click modificati mantengono il link al JPG.
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            openLightbox(parseInt(link.dataset.photoNum, 10), link);
        });
        grid.addEventListener('keydown', (e) => {
            if (e.key !== ' ') return;
            const link = e.target.closest('a[data-photo-num]');
            if (!link) return;
            e.preventDefault();
            openLightbox(parseInt(link.dataset.photoNum, 10), link);
        });
    });

    lbCloseBtn.addEventListener('click', () => closeLightbox(false));
    lbPrevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPhoto(currentPhoto - 1); });
    lbNextBtn.addEventListener('click', (e) => { e.stopPropagation(); showPhoto(currentPhoto + 1); });
    lbModal.addEventListener('click', (e) => { if (e.target === lbModal) closeLightbox(false); });

    lbShareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const shareUrl = new URL(window.location.href);
        shareUrl.searchParams.set('photo', currentPhoto);
        copyText(shareUrl.toString(), shareToast, null, 'Link copiato negli appunti.').catch(() => {});
    });

    window.addEventListener('keydown', (e) => {
        if (!isLbOpen) return;
        if (e.key === 'Escape') {
            closeLightbox(false);
        } else if (e.key === 'ArrowLeft') {
            showPhoto(currentPhoto - 1);
        } else if (e.key === 'ArrowRight') {
            showPhoto(currentPhoto + 1);
        } else if (e.key === 'Tab') {
            const focusable = Array.from(lbModal.querySelectorAll('button:not([disabled])'));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;

    lbModal.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lbModal.addEventListener('touchend', (e) => {
        if (!isLbOpen || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
            showPhoto(dx < 0 ? currentPhoto + 1 : currentPhoto - 1);
        }
    }, { passive: true });

    const initialPhotoParam = parseInt(new URLSearchParams(window.location.search).get('photo'), 10);
    if (initialPhotoParam >= 1 && initialPhotoParam <= TOTAL_PHOTOS) {
        openLightbox(initialPhotoParam, null, true);
    }

    /* =========================================================
       7. COPIA CONTATTI NEL FOOTER (EMAIL E TELEFONO)
       ========================================================= */
    const contactStatus = document.getElementById('contactStatus');
    document.querySelectorAll('footer a[data-copy]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const isMobile = window.matchMedia('(pointer: coarse)').matches;
            const isEmail = link.href.startsWith('mailto:');
            const isPhone = link.href.startsWith('tel:');

            if (isMobile && (isEmail || isPhone)) return;

            e.preventDefault();
            const label = isEmail ? 'Indirizzo email copiato negli appunti.' : 'Numero di telefono copiato negli appunti.';
            copyText(link.dataset.copy, link.querySelector('.copy-toast'), contactStatus, label).catch(() => {});
        });
    });
})();