export const downloadSvg = (svg: SVGSVGElement, filename = "timeline.svg") => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const sanitizeSvgClone = (clone: SVGSVGElement) => {
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const element = walker.currentNode as Element;
    if (element.hasAttribute("filter")) {
      element.removeAttribute("filter");
    }
    if (element.tagName.toLowerCase() === "image") {
      element.removeAttribute("href");
      element.removeAttribute("xlink:href");
    }
  }
};

export const downloadSvgAsPng = async (svg: SVGSVGElement, filename = "timeline.png"): Promise<boolean> => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  sanitizeSvgClone(clone);

  const data = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const rect = svg.getBoundingClientRect();
    const widthAttr = svg.getAttribute("width");
    const heightAttr = svg.getAttribute("height");
    const width = rect.width || (widthAttr ? Number.parseFloat(widthAttr) : 0);
    const height = rect.height || (heightAttr ? Number.parseFloat(heightAttr) : 0);
    if (!width || !height) {
      return false;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return false;
    }

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image-load-failed"));
      image.src = url;
    });

    context.drawImage(image, 0, 0, width, height);

    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL("image/png");
    } catch (error) {
      return false;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    link.click();
    return true;
  } catch (error) {
    console.error("Failed to export SVG as PNG", error);
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
};
