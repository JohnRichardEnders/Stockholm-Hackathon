// Modal dialogs for claim and fact-check details

YouTubeFactChecker.prototype.showClaimDetails = function (claim, factCheck) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 20000; display: flex; align-items: center; justify-content: center;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white; max-width: 600px; max-height: 80vh; overflow-y: auto; border-radius: 12px; padding: 24px; margin: 20px;
  `;

  const status = factCheck ? factCheck.status : 'checking';
  content.innerHTML = `
    <div style="display:flex; justify-content: between; align-items: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #333;">Claim Details</h2>
      <button id="close-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
    </div>
    <div style=\"margin-bottom: 16px;\"><strong>Status:</strong> <span style=\"color: ${this.getStatusColor(
      status
    )}; font-weight: bold; text-transform: capitalize;\">${this.getStatusIcon(status)} ${status}</span></div>
    <div style=\"margin-bottom: 16px;\"><strong>Claim:</strong><p style=\"background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0;\">${
      claim.text
    }</p></div>
    <div style=\"margin-bottom: 16px;\"><strong>Time Range:</strong> ${this.formatTime(
      claim.start_time
    )} - ${this.formatTime(claim.end_time)}</div>
    ${
      factCheck
        ? `
      <div style=\"margin-bottom: 16px;\"><strong>Explanation:</strong><p style=\"line-height: 1.5; margin: 8px 0;\">${
        factCheck.explanation
      }</p></div>
      ${
        factCheck.evidence && factCheck.evidence.length > 0
          ? `
        <div style=\"margin-bottom: 16px;\"><strong>Evidence:</strong><ul style=\"margin: 8px 0; padding-left: 20px;\">${factCheck.evidence
              .map(
                (ev) => `
          <li style=\"margin-bottom: 8px;\"><a href=\"${ev.source_url}\" target=\"_blank\" style=\"color: #1976d2; text-decoration: none;\">${
                  ev.title
                }</a><p style=\"margin: 4px 0; font-size: 13px; color: #666;\">${ev.excerpt}</p></li>`
              )
              .join('')}</ul></div>`
          : ''
      }
    `
        : `
      <div style=\"background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 6px; color: #856404;\">This claim is currently being fact-checked. Results will appear here when available.</div>
    `
    }
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  content.querySelector('#close-modal').addEventListener('click', () => modal.remove());
};

YouTubeFactChecker.prototype.showFactCheckDetails = function (factCheck) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); z-index: 20000; display: flex; align-items: center; justify-content: center;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white; max-width: 600px; max-height: 80vh; overflow-y: auto; border-radius: 12px; padding: 24px; margin: 20px;
  `;

  content.innerHTML = `
    <div style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;\">
      <h2 style=\"margin: 0; color: #333;\">Fact Check Details</h2>
      <button id=\"close-modal\" style=\"background: none; border: none; font-size: 24px; cursor: pointer;\">&times;</button>
    </div>
    <div style=\"margin-bottom: 16px;\"><strong>Status:</strong> <span style=\"color: ${this.getCategoryColor(
      factCheck.categoryOfLikeness
    )}; font-weight: bold; text-transform: capitalize;\">${this.getCategoryIcon(
      factCheck.categoryOfLikeness
    )} ${factCheck.categoryOfLikeness}</span></div>
    <div style=\"margin-bottom: 16px;\"><strong>Claim:</strong> <p style=\"background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0;\">${
      factCheck.claim
    }</p></div>
    <div style=\"margin-bottom: 16px;\"><strong>Timestamp:</strong> ${this.formatTime(
      factCheck.timestamp
    )}</div>
    <div style=\"margin-bottom: 16px;\"><strong>Summary:</strong> <p style=\"line-height: 1.5; margin: 8px 0;\">${
      factCheck.judgement.summary
    }</p></div>
    <div style=\"margin-bottom: 16px;\"><strong>Reasoning:</strong> <p style=\"line-height: 1.5; margin: 8px 0;\">${
      factCheck.judgement.reasoning
    }</p></div>
    ${
      factCheck.sources && factCheck.sources.length > 0
        ? `<div style=\"margin-bottom: 16px;\"><strong>Sources:</strong><ul style=\"margin: 8px 0; padding-left: 20px;\">${factCheck.sources
            .map(
              (source) => `
          <li style=\"margin-bottom: 8px;\"><a href=\"${source}\" target=\"_blank\" style=\"color: #1976d2; text-decoration: none;\">${source}</a></li>`
            )
            .join('')}</ul></div>`
        : ''
    }
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  content.querySelector('#close-modal').addEventListener('click', () => modal.remove());
};

