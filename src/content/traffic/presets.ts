import { TrafficPresetType } from "./types";

export const createCheckPresets = (doc: Document, selectPresetCallback: (preset: TrafficPresetType) => void) => {
    const chartBlockElem = doc.getElementById('extras_chart');
    if (!chartBlockElem) {
        throw new Error('Chart block element not found');
    }

    const presetsDiv = doc.createElement('div');
    presetsDiv.id = 'chart_presets';

    const createButton = (type: TrafficPresetType) => {
        const button = doc.createElement('button');
        button.textContent = type.toString();
        button.addEventListener('click', () => selectPresetCallback(type));
        return button;
    }

    const clearButton = createButton(TrafficPresetType.Clear);
    const top5Button = createButton(TrafficPresetType.Top5);
    const top10Button = createButton(TrafficPresetType.Top10);
    const externalSourcesButton = createButton(TrafficPresetType.External);

    presetsDiv.appendChild(clearButton);
    presetsDiv.appendChild(top5Button);
    presetsDiv.appendChild(top10Button);
    presetsDiv.appendChild(externalSourcesButton);

    chartBlockElem.appendChild(presetsDiv);
}
