import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mantine/core';
import CourseSideBar from '../components/CourseSideBar';

function CourseLayout() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CourseSideBar />
      <Box
        component="main"
        sx={theme => ({
          flex: 1,
          paddingLeft: '300px', // Initial sidebar width
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.md,
          paddingRight: theme.spacing.md,
          transition: 'padding-left 0.2s ease-in-out',
          [`@media (max-width: ${theme.breakpoints.sm}px)`]: {
            paddingLeft: theme.spacing.md,
          },
        })}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

export default CourseLayout;
