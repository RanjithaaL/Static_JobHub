import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus } from 'lucide-react';
import '../styles/JobsDashboard.css';
import JobDetails from './JobDetails';

const JobsDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    title: '',
    location: '',
    userType: [],
    domain: [],
    employmentType: [],
    workType: []
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const domains = [
    'Frontend',
    'Backend',
    'Full Stack',
    'DevOps',
    'Mobile',
    'UI/UX',
    'Data Science',
    'Machine Learning'
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get('https://job-ui-server.onrender.com/api/jobs');
      setJobs(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load jobs');
      setLoading(false);
    }
  };

  const handleFilterChange = (e, field) => {
    setFilters({
      ...filters,
      [field]: e.target.value
    });
  };

  const handleUserTypeChange = (e) => {
    setFilters({
      ...filters,
      userType: [e.target.value]
    });
  };

  const handleDomainChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      domain: e.target.checked 
        ? [...prev.domain, value]
        : prev.domain.filter(item => item !== value)
    }));
  };

  const handleClearFilter = (filterName) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: []
    }));
  };

  const clearFilters = () => {
    setFilters({
      title: '',
      location: '',
      userType: [],
      domain: [],
      employmentType: [],
      workType: []
    });

    const radioInputs = document.querySelectorAll('input[type="radio"]');
    radioInputs.forEach(input => {
      input.checked = false;
    });

    const checkboxInputs = document.querySelectorAll('input[type="checkbox"]');
    checkboxInputs.forEach(input => {
      input.checked = false;
    });
  };

  const handleEmploymentTypeChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      employmentType: e.target.checked 
        ? [...prev.employmentType, value]
        : prev.employmentType.filter(item => item !== value)
    }));
  };

  const handleWorkTypeChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({
      ...prev,
      workType: e.target.checked 
        ? [...prev.workType, value]
        : prev.workType.filter(item => item !== value)
    }));
  };

  const filteredJobs = jobs.filter(job => {
    // Filter by title/company name
    const titleMatch = job.title.toLowerCase().includes(filters.title.toLowerCase()) ||
      job.companyName?.toLowerCase().includes(filters.title.toLowerCase());

    // Filter by location
    const locationMatch = job.location.toLowerCase().includes(filters.location.toLowerCase());

    // Filter by user type
    const userTypeMatch = filters.userType.length === 0 || 
      filters.userType.includes(job.userType?.toLowerCase());

    // Filter by domain
    const domainMatch = filters.domain.length === 0 ||
      filters.domain.includes(job.domain);

    // Filter by employment type
    const employmentTypeMatch = filters.employmentType.length === 0 ||
      filters.employmentType.includes(job.employmentType?.toLowerCase());

    // Filter by work type
    const workTypeMatch = filters.workType.length === 0 ||
      filters.workType.includes(job.workType?.toLowerCase());

    // Return true only if all conditions match
    return titleMatch && 
           locationMatch && 
           userTypeMatch && 
           domainMatch && 
           employmentTypeMatch && 
           workTypeMatch;
  });

  const navigateToHire = () => {
    navigate('/hire');
  };

  const navigateToJobsCreated = () => {
    navigate('/jobs');
  };

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setShowFullScreen(true);
  };

  const handleCloseFullScreen = () => {
    setSelectedJob(null);
    setShowFullScreen(false);
  };

  if (loading) return (
    <div className="loading">
      <div className="loader"></div>
    </div>
  );
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="search-filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Title/skill or Company"
            value={filters.title}
            onChange={(e) => handleFilterChange(e, 'title')}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Location"
            value={filters.location}
            onChange={(e) => handleFilterChange(e, 'location')}
            className="search-input"
          />
          <div className="filter-dropdown">
            <button className={`filter-button ${filters.userType.length > 0 ? 'has-selection' : ''}`}>
              User Type {filters.userType.length > 0 && `(${filters.userType.length})`}
            </button>
            <div className="dropdown-content">
              <label>
                <input
                  type="radio"
                  name="userType"
                  value="fresher"
                  checked={filters.userType.includes('fresher')}
                  onChange={(e) => handleUserTypeChange(e)}
                />
                Fresher
              </label>
              <label>
                <input
                  type="radio"
                  name="userType"
                  value="professional"
                  checked={filters.userType.includes('professional')}
                  onChange={(e) => handleUserTypeChange(e)}
                />
                Professional
              </label>
              <label>
                <input
                  type="radio"
                  name="userType"
                  value="student"
                  checked={filters.userType.includes('student')}
                  onChange={(e) => handleUserTypeChange(e)}
                />
                College Student
              </label>
              <button className="clear-filter" onClick={() => handleClearFilter('userType')}>
                Clear
              </button>
            </div>
          </div>
          <div className="filter-dropdown">
            <button className={`filter-button ${filters.domain.length > 0 ? 'has-selection' : ''}`}>
              Domain {filters.domain.length > 0 && `(${filters.domain.length})`}
            </button>
            <div className="dropdown-content">
              {domains.map(domain => (
                <label key={domain}>
                  <input
                    type="checkbox"
                    value={domain}
                    checked={filters.domain.includes(domain)}
                    onChange={(e) => handleDomainChange(e)}
                  />
                  {domain}
                </label>
              ))}
              <button className="clear-filter" onClick={() => handleClearFilter('domain')}>
                Clear
              </button>
            </div>
          </div>
          <button onClick={clearFilters} className="clear-all-btn">
            clear all
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="filters-sidebar">
          <div className="filter-section">
            <h3>Employment Type</h3>
            {['Full time', 'Internship', 'Part time'].map(type => (
              <label 
                key={type} 
                className="employment-type-label"
                data-type={type.toLowerCase()}
              >
                <input
                  type="checkbox"
                  className="employment-type-checkbox"
                  data-type={type.toLowerCase()}
                  value={type.toLowerCase()}
                  checked={filters.employmentType.includes(type.toLowerCase())}
                  onChange={handleEmploymentTypeChange}
                />
                {type}
              </label>
            ))}
          </div>
          <div className="filter-section">
            <h3>Work Type</h3>
            {['On site', 'Remote', 'Hybrid', 'Field Work'].map(type => (
              <label key={type}>
                <input
                  type="checkbox"
                  value={type.toLowerCase()}
                  checked={filters.workType.includes(type.toLowerCase())}
                  onChange={(e) => handleWorkTypeChange(e)}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <div className="jobs-content">
          <div className="jobs-header">
            <h1>Available Jobs</h1>
            <p className="results-count">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'} found
            </p>
            <div className="header-buttons">
              <button onClick={navigateToJobsCreated} className="jobs-created-btn">
                Jobs Created
              </button>
              <button onClick={navigateToHire} className="archived-btn">
                Archived
              </button>
            </div>
          </div>

          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <div 
                key={job.id} 
                className="job-card"
                data-employment-type={job.employmentType?.toLowerCase()}
                onClick={() => handleJobClick(job)}
              >
                <div className="employment-type-badge" data-type={job.employmentType?.toLowerCase()}>
                  {job.employmentType}
                </div>
                <div className="job-card-header">
                  <h3>{job.title}</h3>
                  <button 
                    className="options-btn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮
                  </button>
                </div>
                <p className="job-description">{job.description}</p>
                <div className="job-footer">
                  <span>📍 {job.location}</span>
                  <span>{job.salary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={navigateToHire} className="floating-add-button">
        <Plus size={36} />
      </button>

      {showFullScreen && selectedJob && (
        <JobDetails job={selectedJob} onClose={handleCloseFullScreen} />
      )}
    </div>
  );
};

export default JobsDashboard;
