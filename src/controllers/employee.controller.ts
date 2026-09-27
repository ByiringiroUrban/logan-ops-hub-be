import { Response } from "express";
import { employeeStorage } from "../services/employee.storage";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../config/prisma";
import { NotificationType } from "@prisma/client";

export const listEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = employeeStorage.getAll();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch employees" });
  }
};

export const getEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const employee = employeeStorage.getById(id);
    if (!employee) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch employee" });
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { names, nationalId, phone, address, role, department, salary, status, joinedDate, notes } = req.body;

    // Strict validation for required fields requested by owner
    if (!names || !nationalId || !phone || !address) {
      res.status(400).json({
        error: "Names, ID (National ID), phone number, and address are required to register an employee.",
      });
      return;
    }

    const newEmployee = employeeStorage.create({
      names,
      nationalId,
      phone,
      address,
      role: role || "Field Worker",
      department: department || "Field Operations",
      salary: salary ? Number(salary) : undefined,
      status: status || "ACTIVE",
      joinedDate: joinedDate || new Date().toISOString().slice(0, 10),
      notes,
    });

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "registered a new employee",
          target: `${newEmployee.names} (${newEmployee.role})`,
        },
      });

      await prisma.notification.create({
        data: {
          title: "New Employee Registered",
          message: `${newEmployee.names} was added to the employee registry.`,
          type: NotificationType.system,
        },
      });
    } catch {
      // Keep going even if DB logging is unavailable
    }

    res.status(201).json(newEmployee);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create employee" });
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = employeeStorage.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const updated = employeeStorage.update(id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "updated employee details",
          target: updated.names,
        },
      });
    } catch {
      // Continue
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update employee" });
  }
};

export const deleteEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const existing = employeeStorage.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const success = employeeStorage.delete(id);
    if (!success) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }

    const actor = req.user?.name || "System";
    try {
      await prisma.activity.create({
        data: {
          actor,
          action: "removed employee record",
          target: existing.names,
        },
      });
    } catch {
      // Continue
    }

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete employee" });
  }
};
