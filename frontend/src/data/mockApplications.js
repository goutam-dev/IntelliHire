export const mockApplications = [
  {
    _id: '507f1f77bcf86cd799439011',
    status: 'applied',
    createdAt: '2025-01-10T10:00:00.000Z',
    resume: { fileName: 'resume_john.pdf', fileUrl: '#' },
    candidate: {
      user: { fullName: 'John Doe', email: 'john@example.com' },
      phoneNumber: '+1 555 111 2222',
      location: 'San Francisco, CA',
      professionalTitle: 'Frontend Developer',
      skills: ['React', 'TypeScript', 'Tailwind'],
      education: [
        { degree: 'BSc CS', fieldOfStudy: 'Computer Science', institution: 'State University', startDate: '2017-09-01', endDate: '2021-06-01' },
      ],
      experience: [
        { title: 'Frontend Engineer', companyName: 'Acme Corp', startDate: '2022-01-01', endDate: '2024-12-01' },
      ],
    },
  },
  {
    _id: '507f1f77bcf86cd799439012',
    status: 'shortlisted',
    createdAt: '2025-01-11T09:30:00.000Z',
    resume: { fileName: 'resume_jane.pdf', fileUrl: '#' },
    candidate: {
      user: { fullName: 'Jane Smith', email: 'jane@example.com' },
      phoneNumber: '+1 555 333 4444',
      location: 'New York, NY',
      professionalTitle: 'Backend Developer',
      skills: ['Node.js', 'Express', 'MongoDB'],
      education: [],
      experience: [],
    },
  },
];