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

export const downloadSvgAsPng = async (svg: SVGSVGElement, filename = "timeline.png") => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const data = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([data], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  const rect = svg.getBoundingClientRect();
  const widthAttr = svg.getAttribute("width");
  const heightAttr = svg.getAttribute("height");
  const width = rect.width || (widthAttr ? Number.parseFloat(widthAttr) : 0);
  const height = rect.height || (heightAttr ? Number.parseFloat(heightAttr) : 0);
  if (!width || !height) {
    URL.revokeObjectURL(url);
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    URL.revokeObjectURL(url);
    return;
  }

  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.src = url;
  });

  context.drawImage(image, 0, 0, width, height);
  URL.revokeObjectURL(url);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
};
