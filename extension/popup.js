let chartInstance = null;
let currentSpan = 'day';

document.addEventListener("DOMContentLoaded", () => {
  // Initial load: sync any unsaved time and fetch the report
  syncAndFetch(currentSpan);

  // Refresh button: Rotates the icon and triggers a fresh sync/fetch
  document.getElementById('refreshBtn').addEventListener('click', (e) => {
    e.target.style.transition = 'transform 0.4s ease';
    e.target.style.transform = `rotate(${e.target.dataset.rot || 360}deg)`;
    e.target.dataset.rot = parseInt(e.target.dataset.rot || 360) + 360;
    
    syncAndFetch(currentSpan);
  });

  // Toggle button: Switches between Today and Weekly views
  document.getElementById('toggleViewBtn').addEventListener('click', (e) => {
    currentSpan = currentSpan === 'day' ? 'week' : 'day';
    e.target.textContent = currentSpan === 'day' ? 'Weekly' : 'Today';
    document.getElementById('viewTitle').textContent = currentSpan === 'day' ? "Today's Report" : "Weekly Report";
    e.target.classList.toggle('active');
    syncAndFetch(currentSpan);
  });
});

/**
 * Messages the background script to sync immediately, then fetches the updated report.
 */
function syncAndFetch(span) {
  chrome.runtime.sendMessage({ action: "forceSync" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
    }
    fetchData(span);
  });
}

/**
 * GETs the report data from the local server.
 */
function fetchData(span) {
  fetch(`http://localhost:3000/api/report/user123?span=${span}`)
    .then(res => res.json())
    .then(data => {
      updateSummary(data);
      renderChart(data);
      renderLists(data.details);
    })
    .catch(err => console.error(err));
}

/**
 * Utility: Formats raw seconds into H/M format (e.g., 3700s -> 1h 1m)
 */
function formatTime(seconds) {
  const parsed = parseInt(seconds, 10);
  if (isNaN(parsed) || parsed <= 0) return "0m";
  
  const h = Math.floor(parsed / 3600);
  const m = Math.floor((parsed % 3600) / 60);
  
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Updates the text values in the top summary cards.
 */
function updateSummary(data) {
  document.getElementById('prod-time').textContent = formatTime(data.productive);
  document.getElementById('unprod-time').textContent = formatTime(data.unproductive);
  document.getElementById('neu-time').textContent = formatTime(data.neutral);
}

/**
 * Configures and renders the Chart.js doughnut chart.
 * Updated to convert raw seconds to minutes for the chart visualization.
 */
function renderChart(data) {
  const ctx = document.getElementById('productivityChart').getContext('2d');
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Convert raw seconds from the backend into minutes for the chart data points
  const dataInMinutes = [
    Math.round((data.productive || 0) / 60),
    Math.round((data.unproductive || 0) / 60),
    Math.round((data.neutral || 0) / 60)
  ];

  // Custom plugin to draw a placeholder gray ring when no data is available
  const emptyDoughnutPlugin = {
    id: 'emptyDoughnut',
    afterDraw(chart) {
      const { datasets } = chart.data;
      const hasData = datasets[0].data.some(item => item > 0);
      
      if (!hasData) {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        
        if (meta.data.length > 0) {
          const arc = meta.data[0];
          const thickness = arc.outerRadius - arc.innerRadius;
          
          ctx.beginPath();
          ctx.arc(arc.x, arc.y, arc.innerRadius + (thickness / 2), 0, 2 * Math.PI);
          ctx.lineWidth = thickness || 15;
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
          ctx.stroke();
        }
      }
    }
  };

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Productive', 'Unproductive', 'Neutral'],
      datasets: [{
        data: dataInMinutes, // Data is now in minutes
        backgroundColor: [
          'rgba(76, 175, 80, 0.85)',
          'rgba(244, 67, 54, 0.85)',
          'rgba(96, 125, 139, 0.85)'
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      cutout: '60%',
      radius: '100%',
      maintainAspectRatio: false, 
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 10,
            font: { family: "'Segoe UI', Tahoma, sans-serif", size: 11 }
          }
        },
        // Tooltip callback converts the minute value back to a formatted H/M string on hover
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.label || '';
              if (label) {
                label += ': ';
              }
              const totalSeconds = context.raw * 60;
              label += formatTime(totalSeconds);
              return label;
            }
          }
        }
      }
    },
    plugins: [emptyDoughnutPlugin]
  });
}

/**
 * Sorts and lists the top 3 sites by time spent.
 */
function renderLists(details) {
  const mostUsedContainer = document.getElementById('mostUsedList');
  
  if (!details || Object.keys(details).length === 0) {
    mostUsedContainer.innerHTML = '<div style="text-align:center; font-size:12px; padding:10px;">No data yet</div>';
    return;
  }
  
  mostUsedContainer.innerHTML = '';
  
  // Convert object to array, filter for domains used > 1 min, and sort descending
  const sortedDetails = Object.entries(details)
    .filter(([_, time]) => time >= 60)
    .sort((a, b) => b[1] - a[1]);

  const topSites = sortedDetails.slice(0, 3);
  
  if (topSites.length === 0) {
    mostUsedContainer.innerHTML = '<div style="text-align:center; font-size:12px; padding:10px;">No data yet</div>';
    return;
  }

  topSites.forEach(([domain, time], index) => {
    const div = document.createElement('div');
    div.className = 'site-item top-site';
    
    // Assign ranked background gradients
    if (index === 0) div.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(255,255,255,0.7) 100%)';
    if (index === 1) div.style.background = 'linear-gradient(135deg, rgba(192,192,192,0.3) 0%, rgba(255,255,255,0.7) 100%)';
    if (index === 2) div.style.background = 'linear-gradient(135deg, rgba(205,127,50,0.3) 0%, rgba(255,255,255,0.7) 100%)';

    const domainSpan = document.createElement('span');
    domainSpan.textContent = `${index + 1}. ${domain}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = formatTime(time);
    timeSpan.style.fontWeight = '700';
    
    div.appendChild(domainSpan);
    div.appendChild(timeSpan);
    mostUsedContainer.appendChild(div);
  });
}