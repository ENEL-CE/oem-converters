interface WorkerResult {
    name: string;
    lat: string;
    lon: string;
    time: string;
    desc: string;
    utm_e: string;
    utm_n: string;
    pOrder: number;
}

self.onmessage = async function (e: MessageEvent) {
    const file: File = e.data.file;
    const options = e.data.options || { points: true, lines: true, texts: true };
    const totalBytes = file.size;
    let processedBytes = 0;

    if (totalBytes === 0) {
        self.postMessage({ type: 'error', message: 'CSV vazio' });
        return;
    }

    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    const dataArr: WorkerResult[] = [];
    let leftover = "";

    // Step 1: Read Stream
    while (true) {
        const { done, value } = await reader.read();

        if (value) {
            processedBytes += value.length;
            const progress = Math.floor((processedBytes / totalBytes) * 40); // 0 to 40%
            if (progress % 5 === 0) self.postMessage({ type: 'progress', progress });

            const chunkString = decoder.decode(value, { stream: true });
            let lines = (leftover + chunkString).split('\n');
            leftover = lines.pop() || ""; // keep incomplete line

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                // Check header for 'custom_coords'
                if (line.startsWith('"name"') || line.startsWith('name,')) {
                    if (!line.includes('custom_coords')) {
                        self.postMessage({ type: 'error', message: 'CSV nao contem coordenadas UTM' });
                        return;
                    }
                    continue; // Skip header
                }

                // Simple CSV split considering Locus Map structure
                let parts = line.split('","');
                if (parts.length < 9) continue;

                parts[0] = parts[0].replace(/^"/, '');
                parts[parts.length - 1] = parts[parts.length - 1].replace(/"$/, '');

                const name = parts[0];
                const lat = parts[1];
                const lon = parts[2];
                const time = parts[5];
                const desc = parts[6];
                const custom_coords = parts[8];

                // Parse "ZZB mE mN"
                const ccParts = custom_coords.split(" ");
                if (ccParts.length < 3) continue;
                const utm_e = ccParts[1];
                const utm_n = ccParts[2];

                // Parse order from name
                const pMatch = name.match(/^P0*(\d+)/i);
                const pOrder = pMatch ? parseInt(pMatch[1], 10) : Infinity;

                dataArr.push({
                    name, lat, lon, time, desc, utm_e, utm_n, pOrder
                });
            }
        }

        if (done) break;
    }

    if (dataArr.length === 0) {
        self.postMessage({ type: 'error', message: 'CSV vazio' });
        return;
    }

    self.postMessage({ type: 'progress', progress: 50 });

    // Step 2: Sort
    dataArr.sort((a, b) => {
        if (a.pOrder !== Infinity || b.pOrder !== Infinity) {
            return a.pOrder - b.pOrder;
        }
        return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    self.postMessage({ type: 'progress', progress: 70 });

    // Step 3: Generate .scr
    const scrParts: string[] = [];
    scrParts.push("_Osmode 0\n_PDMODE\n65\n_PDSIZE\n3\n");

    const generatePoints = () => {
        for (const point of dataArr) {
            scrParts.push(`_Point ${point.utm_e},${point.utm_n},0\n`);
        }
    };

    const generateLines = () => {
        for (let i = 0; i < dataArr.length - 1; i++) {
            const current = dataArr[i];
            const next = dataArr[i + 1];
            scrParts.push(`_Line\n${current.utm_e},${current.utm_n}\n${next.utm_e},${next.utm_n}\n\n`);
        }
    };

    const generateTexts = () => {
        for (const point of dataArr) {
            scrParts.push(`_mtext ${point.utm_e},${point.utm_n} 0 ${point.name}\n(0${point.utm_e},${point.utm_n})\n\\C2;${point.desc}\n\n`);
        }
    };

    if (options.points) generatePoints();
    self.postMessage({ type: 'progress', progress: 80 });

    if (options.lines) generateLines();
    self.postMessage({ type: 'progress', progress: 85 });

    if (options.texts) generateTexts();
    self.postMessage({ type: 'progress', progress: 95 });

    scrParts.push("_Osmode 16383\n");

    // Step 4: Create Blob and return
    const blob = new Blob(scrParts, { type: 'text/plain' });
    self.postMessage({ type: 'done', blob });
};
