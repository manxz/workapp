/**
 * Favicon Badge
 * 
 * Dynamically generates a favicon with a red notification dot overlay.
 * Uses canvas to draw the badge on top of the original favicon.
 */

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let faviconLink: HTMLLinkElement | null = null;

// Embed the base SVG directly
const baseFaviconSVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="32" height="32" rx="6" fill="#06DF79"/>
<path d="M17.125 8.5C17.125 7.87868 16.6213 7.375 16 7.375C15.3787 7.375 14.875 7.87868 14.875 8.5V14.2322L9.90419 11.3661C9.36024 11.0554 8.6698 11.2479 8.35913 11.7919C8.04846 12.3358 8.24094 13.0262 8.78489 13.3369L13.7557 16.2031L8.78489 19.0692C8.24094 19.3799 8.04846 20.0703 8.35913 20.6143C8.6698 21.1582 9.36024 21.3507 9.90419 21.04L14.875 18.1739V23.9062C14.875 24.5275 15.3787 25.0312 16 25.0312C16.6213 25.0312 17.125 24.5275 17.125 23.9062V18.1739L22.0958 21.04C22.6398 21.3507 23.3302 21.1582 23.6409 20.6143C23.9515 20.0703 23.7591 19.3799 23.2151 19.0692L18.2443 16.2031L23.2151 13.3369C23.7591 13.0262 23.9515 12.3358 23.6409 11.7919C23.3302 11.2479 22.6398 11.0554 22.0958 11.3661L17.125 14.2322V8.5Z" fill="white"/>
</svg>`;

/**
 * Initialize the favicon badge system
 */
export function setupFavicon() {
  if (typeof window === 'undefined') return;
  
  // Create canvas for drawing
  canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  ctx = canvas.getContext('2d');
  
  // Remove any existing favicon links to avoid conflicts
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(link => link.remove());
  
  // Create a fresh favicon link element
  faviconLink = document.createElement('link');
  faviconLink.rel = 'icon';
  faviconLink.type = 'image/png';
  document.head.appendChild(faviconLink);
  
  // Initialize with no badge
  drawFavicon(false);
}

/**
 * Internal function to draw the favicon
 */
function drawFavicon(hasUnread: boolean) {
  if (!canvas || !ctx || !faviconLink) return;
  
  // Convert SVG to image
  const svgBlob = new Blob([baseFaviconSVG], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  
  img.onload = () => {
    // Clear canvas
    ctx!.clearRect(0, 0, 32, 32);
    
    // Draw base favicon
    ctx!.drawImage(img, 0, 0, 32, 32);
    
    if (hasUnread) {
      // Draw red notification dot in top-right corner
      const dotRadius = 5;
      const dotX = 25;
      const dotY = 7;
      
      // Red circle
      ctx!.fillStyle = '#FF4D4D';
      ctx!.beginPath();
      ctx!.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
      ctx!.fill();
      
      // White border for visibility
      ctx!.strokeStyle = 'white';
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
      ctx!.stroke();
    }
    
    // Force browser to update by removing and re-adding the link
    const newLink = faviconLink!.cloneNode() as HTMLLinkElement;
    newLink.href = canvas!.toDataURL('image/png');
    
    faviconLink!.remove();
    document.head.appendChild(newLink);
    faviconLink = newLink;
    
    // Clean up
    URL.revokeObjectURL(url);
  };
  
  img.src = url;
}

/**
 * Update favicon with or without notification badge
 */
export function updateFaviconWithBadge(hasUnread: boolean) {
  if (typeof window === 'undefined') return;
  
  // Auto-initialize if not set up yet (handles hot reload)
  if (!canvas || !ctx || !faviconLink) {
    setupFavicon();
    if (!canvas || !ctx || !faviconLink) return;
  }
  
  // Draw the favicon
  drawFavicon(hasUnread);
}
