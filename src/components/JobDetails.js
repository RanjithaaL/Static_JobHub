import React, { useEffect } from 'react';
import '../styles/DisplayJobsPage.css';

const JobDetails = ({ job, onClose }) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.classList.contains('job-details-overlay')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleApply = () => {
    if (job.applyLink) {
      window.open(job.applyLink, '_blank');
    }
  };

  return (
    <div className="job-details-overlay" onClick={onClose}>
      <div className="job-details-container" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <div className="job-header">
          <div className="company-info">
            <div className="company-logo">
              {job.companyName?.charAt(0)}
            </div>
            <div className="company-details">
              <h2>{job.title}</h2>
              <p className="company-name">{job.companyName}</p>
            </div>
          </div>
        </div>

        {job.isSpam && (
          <div className="spam-warning-banner">
            ⚠️ This job posting has been flagged as potentially suspicious. Please proceed with caution.
          </div>
        )}

        <div className="job-meta">
          <div className="meta-item">
            <span className="meta-label">Location</span>
            <span className="meta-value">{job.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Employment Type</span>
            <span className="meta-value">{job.employmentType}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Work Type</span>
            <span className="meta-value">{job.workType}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Experience Level</span>
            <span className="meta-value">{job.userType}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Domain</span>
            <span className="meta-value">{job.domain}</span>
          </div>
          {job.salaryRange && (
            <div className="meta-item">
              <span className="meta-label">Salary Range</span>
              <span className="meta-value">{job.salaryRange}</span>
            </div>
          )}
        </div>

        <div className="job-description-section">
          <h3>Job Description</h3>
          <div className="description-content">
            {job.description}
          </div>
        </div>

        {job.companySummary && (
          <div className="company-summary-section">
            <h3>Life at {job.companyName}</h3>
            <div className="company-summary-content">
              {job.companySummary}
              {job.careerLink && (
                <a 
                  href={job.careerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="career-link"
                >
                  Learn more about careers at {job.companyName} →
                </a>
              )}
            </div>
          </div>
        )}

        <div className="job-footer">
          <p>Posted by: {job.createdBy}</p>
          <p>Posted on: {new Date(job.createdAt).toLocaleDateString()}</p>
          <button className="apply-button" onClick={handleApply}>
              Apply
            </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
